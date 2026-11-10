import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { createApp, htmlCsp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { openDatabase, migrate, restrictLocalRuntime, assertRuntimePrivileges, scoped, type Database } from '../src/db.js';
import { seedDemo, type DemoCredentials } from '../src/seed.js';
import { digest, makeToken, hashPassword, verifyPassword } from '../src/password.js';

// light-my-request defaults its synthetic Host header to localhost:80.
const config = { ...loadConfig({ NODE_ENV: 'test', DB_ENGINE: 'pglite' }), port: 80 };
let db: Database;
let app: Awaited<ReturnType<typeof createApp>>;
let credentials: DemoCredentials;
const sessions: Record<string, { token: string; id: string }> = {};
let churchA: string;
let churchB: string;
const a = 'comunidade-esperanca';
const b = 'igreja-caminho';
const headers = (key = 'owner-a') => ({ authorization: `Bearer ${sessions[key]!.token}` });

before(async () => {
  db = await openDatabase({ engine: 'pglite', dataDir: 'memory://' });
  await migrate(db);
  await migrate(db); // checksum-checked and idempotent
  credentials = await seedDemo(db);
  await assert.rejects(assertRuntimePrivileges(db), /Unsafe database runtime/);
  await restrictLocalRuntime(db);
  await assertRuntimePrivileges(db);
  app = await createApp(db, config);
  for (const [key, role, slug] of [['owner-a', 'owner', a], ['editor-a', 'editor', a], ['finance-a', 'finance', a], ['owner-b', 'owner', b]]) {
    const account = credentials.accounts.find((item) => item.role === role && item.churchSlug === slug)!;
    const response = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: { email: account.email, password: account.password } });
    assert.equal(response.statusCode, 200, response.statusCode !== 200 ? response.json().error?.code : 'Fixture login must work');
    const data = response.json();
    sessions[key!] = { token: data.token, id: data.user.id };
  }
  churchA = (await app.inject(`/v1/churches/${a}`)).json().church.id;
  churchB = (await app.inject(`/v1/churches/${b}`)).json().church.id;
});
after(async () => { await app?.close(); await db?.close(); });

test('inline CSP hashes match HTML parser line-ending normalization on Windows', () => {
  const script = "\n'use strict';\nwindow.example = true;\n";
  const style = '\nbody { color: red; }\n';
  const html = `<style>${style}</style><script>${script}</script>`;
  const expectedScript = createHash('sha256').update(script).digest('base64');
  const expectedStyle = createHash('sha256').update(style).digest('base64');
  for (const newline of ['\n', '\r\n', '\r']) {
    const csp = htmlCsp(html.replace(/\n/g, newline));
    assert.ok(csp.includes(`script-src 'sha256-${expectedScript}'`));
    assert.ok(csp.includes(`style-src 'sha256-${expectedStyle}'`));
    assert.ok(!/script-src[^;]*unsafe-inline/.test(csp));
  }
});

test('public API shows only published content from the requested church', async () => {
  const response = await app.inject(`/v1/churches/${a}/posts`);
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().items.length, 1);
  assert.ok(response.json().items.every((row: { status: string; churchId: string }) => row.status === 'published' && row.churchId === churchA));
  const campaigns = await app.inject(`/v1/churches/${a}/campaigns`);
  assert.equal(campaigns.json().items.length, 0);
  assert.equal(response.headers['cache-control'], 'no-store');
});

test('unauthenticated admin requests and forged sessions fail closed', async () => {
  assert.equal((await app.inject(`/v1/admin/${a}/posts`)).statusCode, 401);
  assert.equal((await app.inject({ url: `/v1/admin/${a}/posts`, headers: { authorization: `Bearer ${makeToken()}` } })).statusCode, 401);
  assert.equal((await app.inject({ url: '/v1/auth/me', headers: { authorization: 'Bearer malformed' } })).statusCode, 401);
});

test('identity and memberships come from the authenticated session only', async () => {
  const response = await app.inject({ url: '/v1/auth/me', headers: headers() });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().memberships.length, 1);
  assert.equal(response.json().memberships[0].churchId, churchA);
  assert.equal(response.json().memberships[0].role, 'owner');
  assert.equal('password_hash' in response.json().user, false);
});

test('switching the slug does not authorize another church', async () => {
  const response = await app.inject({ url: `/v1/admin/${b}/posts`, headers: headers() });
  assert.equal(response.statusCode, 403);
  const mutation = await app.inject({ method: 'POST', url: `/v1/admin/${b}/posts`, headers: headers(), payload: { title: 'Ataque', body: 'Não autorizado', status: 'published' } });
  assert.equal(mutation.statusCode, 403);
});

test('editor can publish real content; public sees it; deletion is audited', async () => {
  const created = await app.inject({ method: 'POST', url: `/v1/admin/${a}/posts`, headers: headers('editor-a'), payload: { title: 'Encontro da semana', body: 'Texto preparado pela equipe.', status: 'draft' } });
  assert.equal(created.statusCode, 201);
  const id = created.json().item.id;
  const before = (await app.inject(`/v1/churches/${a}/posts`)).json().items;
  assert.ok(!before.some((item: { id: string }) => item.id === id));
  const published = await app.inject({ method: 'PATCH', url: `/v1/admin/${a}/posts/${id}`, headers: headers('editor-a'), payload: { status: 'published' } });
  assert.equal(published.statusCode, 200);
  assert.ok((await app.inject(`/v1/churches/${a}/posts`)).json().items.some((item: { id: string }) => item.id === id));
  assert.equal((await app.inject({ method: 'DELETE', url: `/v1/admin/${a}/posts/${id}`, headers: headers('editor-a') })).statusCode, 204);
  const audit = (await app.inject({ url: `/v1/admin/${a}/audit`, headers: headers() })).json().items;
  const actions = audit.filter((item: { entityId: string }) => item.entityId === id);
  assert.deepEqual(actions.map((item: { action: string }) => item.action).sort(), ['delete', 'insert', 'update']);
  assert.ok(actions.every((item: { actorId: string }) => item.actorId === sessions['editor-a']!.id));
});

test('foreign UUID mutations cannot cross the tenant boundary', async () => {
  const other = (await app.inject({ url: `/v1/admin/${b}/posts`, headers: headers('owner-b') })).json().items[0];
  assert.equal((await app.inject({ method: 'PATCH', url: `/v1/admin/${a}/posts/${other.id}`, headers: headers(), payload: { title: 'Tentativa externa' } })).statusCode, 404);
  assert.equal((await app.inject({ method: 'DELETE', url: `/v1/admin/${a}/posts/${other.id}`, headers: headers() })).statusCode, 404);
  const unchanged = (await app.inject({ url: `/v1/admin/${b}/posts`, headers: headers('owner-b') })).json().items.find((item: { id: string }) => item.id === other.id);
  assert.equal(unchanged.title, other.title);
});

test('body fields cannot override tenant, role, identity or confirmed money', async () => {
  for (const extra of [{ churchId: churchB }, { tenant_id: churchB }, { role: 'owner' }, { id: randomUUID() }]) {
    const response = await app.inject({ method: 'POST', url: `/v1/admin/${a}/posts`, headers: headers(), payload: { title: 'Aviso seguro', body: '', status: 'draft', ...extra } });
    assert.equal(response.statusCode, 400);
  }
  const response = await app.inject({ method: 'POST', url: `/v1/admin/${a}/campaigns`, headers: headers(), payload: { title: 'Campanha', body: '', status: 'draft', goalCents: 20000, confirmedTotalCents: 10000 } });
  assert.equal(response.statusCode, 400);
});

test('finance and editor permissions remain separate in API and database', async () => {
  assert.equal((await app.inject({ url: `/v1/admin/${a}/posts`, headers: headers('finance-a') })).statusCode, 403);
  assert.equal((await app.inject({ url: `/v1/admin/${a}/campaigns`, headers: headers('editor-a') })).statusCode, 403);
  assert.equal((await app.inject({ url: `/v1/admin/${a}/audit`, headers: headers('editor-a') })).statusCode, 403);
  assert.equal((await app.inject({ method: 'PATCH', url: `/v1/admin/${a}/branding`, headers: headers('finance-a'), payload: { name: 'Troca não autorizada' } })).statusCode, 403);
  const result = await scoped(db, { role: 'member', userId: sessions['finance-a']!.id, churchId: churchA }, (tx) => tx.query('SELECT kind FROM church_platform.entries'));
  assert.ok(result.rows.length > 0 && result.rows.every((row) => row.kind === 'campaigns'));
});

test('events enforce a valid time range and campaigns hold goals, not donations', async () => {
  const payload = { title: 'Encontro local', body: 'Evento de teste', status: 'draft', startsAt: '2026-12-01T10:00:00Z', endsAt: '2026-12-01T09:00:00Z', location: 'Salão' };
  assert.equal((await app.inject({ method: 'POST', url: `/v1/admin/${a}/events`, headers: headers('editor-a'), payload })).statusCode, 400);
  const valid = await app.inject({ method: 'POST', url: `/v1/admin/${a}/events`, headers: headers('editor-a'), payload: { ...payload, endsAt: '2026-12-01T11:00:00Z' } });
  assert.equal(valid.statusCode, 201);
  const campaign = await app.inject({ method: 'POST', url: `/v1/admin/${a}/campaigns`, headers: headers('finance-a'), payload: { title: 'Campanha teste', body: 'Sem PSP', goalCents: 100000, status: 'published' } });
  assert.equal(campaign.statusCode, 201);
  assert.equal('confirmedTotalCents' in campaign.json().item, false);
  assert.equal('pixKey' in campaign.json().item, false);
});

test('branding uses constrained colors and immutable church identity', async () => {
  const good = await app.inject({ method: 'PATCH', url: `/v1/admin/${a}/branding`, headers: headers(), payload: { accentColor: '#DDCCAA', tagline: 'Comunidade de teste' } });
  assert.equal(good.statusCode, 200);
  assert.equal((await app.inject(`/v1/churches/${a}`)).json().church.accentColor, '#DDCCAA');
  for (const payload of [{ slug: 'outro-nome' }, { primaryColor: 'url(https://external.invalid)' }, { active: false }]) {
    assert.equal((await app.inject({ method: 'PATCH', url: `/v1/admin/${a}/branding`, headers: headers(), payload })).statusCode, 400);
  }
});

test('SQL-looking text stays text; URL injection and unknown fields are rejected', async () => {
  const title = "Aviso'; DROP TABLE church_platform.entries; --";
  const response = await app.inject({ method: 'POST', url: `/v1/admin/${a}/posts`, headers: headers(), payload: { title, body: '<script>alert(1)</script>', status: 'draft' } });
  assert.equal(response.statusCode, 201);
  assert.equal(response.json().item.title, title);
  assert.equal((await app.inject('/v1/churches/abc%27%20OR%201%3D1--/posts')).statusCode, 400);
  assert.equal((await app.inject(`/v1/churches/${b}/posts`)).statusCode, 200);
});

test('real RLS restricts direct SELECT without an application WHERE clause', async () => {
  const publicRows = await scoped(db, { role: 'public', churchId: churchA }, (tx) => tx.query('SELECT church_id,status FROM church_platform.entries'));
  assert.ok(publicRows.rows.length > 0 && publicRows.rows.every((row) => row.church_id === churchA && row.status === 'published'));
  const noContext = await scoped(db, { role: 'public' }, (tx) => tx.query('SELECT * FROM church_platform.entries'));
  assert.equal(noContext.rows.length, 0);
  const forgedTenant = await scoped(db, { role: 'member', churchId: churchB, userId: sessions['owner-a']!.id }, (tx) => tx.query('SELECT * FROM church_platform.entries'));
  assert.equal(forgedTenant.rows.length, 0, 'A church GUC is not membership');
  await assert.rejects(scoped(db, { role: 'member', churchId: churchB, userId: sessions['owner-a']!.id }, (tx) => tx.query("INSERT INTO church_platform.entries(id,church_id,kind,title) VALUES($1,$2,'posts','Unauthorized')", [randomUUID(), churchB])), { code: '42501' });
});

test('runtime cannot disable RLS, escalate roles, read password hashes or rewrite audit', async () => {
  const scope = { role: 'member' as const, churchId: churchA, userId: sessions['owner-a']!.id };
  for (const sql of [
    'ALTER TABLE church_platform.entries DISABLE ROW LEVEL SECURITY',
    'TRUNCATE church_platform.entries',
    'SELECT * FROM church_identity.users',
    'DELETE FROM church_platform.audit_events',
    "UPDATE church_platform.audit_events SET action='hidden'",
    "INSERT INTO church_platform.audit_events(church_id,action,entity_type,entity_id,changes) VALUES('00000000-0000-0000-0000-000000000000','fake','fake','00000000-0000-0000-0000-000000000000','{}')",
    'SET LOCAL ROLE postgres',
    "INSERT INTO church_platform.memberships VALUES('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000000','owner')",
  ]) await assert.rejects(scoped(db, scope, (tx) => tx.exec(sql)), { code: '42501' });
  await assert.rejects(scoped(db, scope, async (tx) => { await tx.exec('SET LOCAL row_security = off'); await tx.query('SELECT * FROM church_platform.entries'); }), { code: '42501' });
  await assert.rejects(db.query('SELECT * FROM church_platform.entries'), { code: '42501' });
});

test('concurrent requests and rollback never retain another tenant context', async () => {
  await Promise.all(Array.from({ length: 20 }, async (_, index) => {
    const churchId = index % 2 ? churchA : churchB;
    const userId = sessions[index % 2 ? 'owner-a' : 'owner-b']!.id;
    const { rows } = await scoped(db, { role: 'member', churchId, userId }, (tx) => tx.query('SELECT church_id FROM church_platform.entries'));
    assert.ok(rows.length > 0 && rows.every((row) => row.church_id === churchId));
  }));
  await assert.rejects(scoped(db, { role: 'member', churchId: churchA, userId: sessions['owner-a']!.id }, async () => { throw new Error('rollback-test'); }), /rollback-test/);
  const { rows } = await db.query("SELECT current_user AS role, nullif(current_setting('app.church_id',true),'') AS tenant, nullif(current_setting('app.user_id',true),'') AS person");
  assert.equal(rows[0]!.role, 'bc_platform_local');
  assert.equal(rows[0]!.tenant, null);
  assert.equal(rows[0]!.person, null);
});

test('logout revokes immediately and an expired session is rejected', async () => {
  const token = makeToken();
  await scoped(db, { role: 'auth' }, (tx) => tx.query('SELECT church_identity.issue_session($1,$2,$3)', [sessions['owner-a']!.id, digest(token), new Date(Date.now() + 300).toISOString()]));
  await new Promise((resolve) => setTimeout(resolve, 400));
  assert.equal((await app.inject({ url: '/v1/auth/me', headers: { authorization: `Bearer ${token}` } })).statusCode, 401);
  const fresh = makeToken();
  await scoped(db, { role: 'auth' }, (tx) => tx.query('SELECT church_identity.issue_session($1,$2,$3)', [sessions['owner-a']!.id, digest(fresh), new Date(Date.now() + 60000).toISOString()]));
  const auth = { authorization: `Bearer ${fresh}` };
  assert.equal((await app.inject({ method: 'POST', url: '/v1/auth/logout', headers: auth })).statusCode, 204);
  assert.equal((await app.inject({ url: '/v1/auth/me', headers: auth })).statusCode, 401);
});

test('passwords use independent scrypt salts and timing-safe validation', async () => {
  const password = makeToken();
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword(`${password}x`, first), false);
  assert.equal(await verifyPassword(password, 'invalid'), false);
});

test('login errors reveal neither account existence nor stored password data', async () => {
  const known = credentials.accounts[0]!;
  const first = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: { email: known.email, password: 'wrong-password' } });
  const second = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: { email: 'absent@example.invalid', password: 'wrong-password' } });
  assert.equal(first.statusCode, 401);
  assert.deepEqual(first.json(), second.json());
  assert.equal(first.body.includes('scrypt'), false);
});

test('host, cross-origin, content type and size protections apply before mutation', async () => {
  assert.equal((await app.inject({ url: '/health', headers: { host: 'evil.example' } })).statusCode, 403);
  assert.equal((await app.inject({ url: '/health', headers: { origin: 'https://evil.example' } })).statusCode, 403);
  assert.equal((await app.inject({ url: '/health', headers: { 'sec-fetch-site': 'cross-site' } })).statusCode, 403);
  assert.equal((await app.inject({ method: 'POST', url: '/v1/auth/login', headers: { 'content-type': 'application/x-www-form-urlencoded' }, payload: 'email=a&password=b' })).statusCode, 415);
  assert.equal((await app.inject({ method: 'POST', url: '/v1/auth/login', payload: { email: 'x@example.invalid', password: 'x'.repeat(40000) } })).statusCode, 413);
});

test('persistent login throttle rejects excessive guesses', async () => {
  const key = digest(`test-throttle:${randomUUID()}`);
  const responses = [];
  for (let index = 0; index < 21; index++) responses.push(await scoped(db, { role: 'auth' }, (tx) => tx.query<{ allowed: boolean }>('SELECT church_identity.allow_login($1) AS allowed', [key])));
  assert.ok(responses.slice(0, 20).every((response) => response.rows[0]?.allowed === true));
  assert.equal(responses[20]!.rows[0]?.allowed, false);
});

test('production configuration refuses local engine and demonstration seed', () => {
  assert.throws(() => loadConfig({ NODE_ENV: 'production' }), /Production requires/);
  assert.throws(() => loadConfig({ NODE_ENV: 'production', DB_ENGINE: 'pg', DATABASE_URL: 'postgres://runtime@localhost/app', PUBLIC_ORIGIN: 'https://api.example.invalid', DEMO_SEED: 'true' }), /prohibited/);
  assert.throws(() => loadConfig({ NODE_ENV: 'production', DB_ENGINE: 'pg', DATABASE_URL: 'postgres://runtime@localhost/app' }), /HTTPS/);
  assert.throws(() => loadConfig({ HOST: '0.0.0.0' }), /127.0.0.1/);
});

test('PGlite reopens durable content, sessions and non-regenerated credentials', async () => {
  const root = resolve('.local/test-databases');
  await mkdir(root, { recursive: true });
  const directory = await mkdtemp(`${root}${sep}persistence-`);
  const credentialPath = resolve(directory, 'demo-credentials.json');
  const enginePath = resolve(directory, 'db');
  let store: Database | undefined;
  try {
    store = await openDatabase({ engine: 'pglite', dataDir: enginePath });
    await migrate(store);
    await seedDemo(store, credentialPath);
    const before = digest(await readFile(credentialPath, 'utf8'));
    await seedDemo(store, credentialPath);
    assert.equal(digest(await readFile(credentialPath, 'utf8')), before);
    const user = (await store.query<{ id: string }>('SELECT id FROM church_identity.users LIMIT 1')).rows[0]!;
    const tenant = (await store.query<{ church_id: string }>('SELECT church_id FROM church_platform.memberships WHERE user_id=$1', [user.id])).rows[0]!;
    const token = makeToken();
    const marker = randomUUID();
    await restrictLocalRuntime(store);
    await scoped(store, { role: 'auth' }, (tx) => tx.query('SELECT church_identity.issue_session($1,$2,$3)', [user.id, digest(token), new Date(Date.now() + 60000).toISOString()]));
    // Seed chooses owner first; read explicit role to avoid relying on row ordering.
    const owner = (await scoped(store, { role: 'auth' }, (tx) => tx.query<{ id: string }>('SELECT id FROM church_identity.login_record($1)', [`owner@${a}.example`]))).rows[0]!;
    const ownerTenant = (await scoped(store, { role: 'member', userId: owner.id }, (tx) => tx.query<{ church_id: string }>('SELECT church_id FROM church_platform.memberships'))).rows[0]!;
    await scoped(store, { role: 'member', userId: owner.id, churchId: ownerTenant.church_id }, (tx) => tx.query("INSERT INTO church_platform.entries(id,church_id,kind,title) VALUES($1,$2,'posts','Persistent marker')", [marker, ownerTenant.church_id]));
    await store.close();
    store = await openDatabase({ engine: 'pglite', dataDir: enginePath });
    await restrictLocalRuntime(store);
    await assertRuntimePrivileges(store);
    const session = await scoped(store, { role: 'auth' }, (tx) => tx.query('SELECT id FROM church_identity.session_user($1)', [digest(token)]));
    assert.equal(session.rows[0]?.id, user.id);
    const content = await scoped(store, { role: 'member', userId: owner.id, churchId: ownerTenant.church_id }, (tx) => tx.query('SELECT id FROM church_platform.entries WHERE id=$1', [marker]));
    assert.equal(content.rows.length, 1);
    assert.equal(digest(await readFile(credentialPath, 'utf8')), before);
    assert.ok(tenant.church_id);
  } finally {
    await store?.close();
    const checked = resolve(directory);
    assert.ok(checked.startsWith(`${root}${sep}`) && checked !== root);
    await rm(checked, { recursive: true, force: true });
  }
});
