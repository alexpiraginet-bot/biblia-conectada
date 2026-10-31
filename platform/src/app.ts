import Fastify, { type FastifyRequest } from 'fastify';
import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { z, ZodError } from 'zod';
import type { Config } from './config.js';
import { scoped, type Database, type Queryable, type Row } from './db.js';
import { digest, makeToken, hashPassword, verifyPassword } from './password.js';

class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message); }
}
interface User extends Row { id: string; email: string; name: string }
const slugSchema = z.string().regex(/^[a-z][a-z0-9-]{2,59}$/);
const idSchema = z.uuid();
const content = { title: z.string().trim().min(2).max(160), body: z.string().max(20000), status: z.enum(['draft', 'published']) };
const schemas = {
  posts: z.object(content).strict(),
  events: z.object({ ...content, startsAt: z.iso.datetime({ offset: true }), endsAt: z.iso.datetime({ offset: true }).nullable().optional(), location: z.string().max(300) }).strict(),
  campaigns: z.object({ ...content, goalCents: z.number().int().min(100).max(1_000_000_000) }).strict(),
};
type Kind = keyof typeof schemas;
const columns: Record<string, string> = { title: 'title', body: 'body', status: 'status', startsAt: 'starts_at', endsAt: 'ends_at', location: 'location', goalCents: 'goal_cents' };
const entryFields = `id, church_id AS "churchId", kind, title, body, status, starts_at AS "startsAt", ends_at AS "endsAt", location, goal_cents AS "goalCents", created_at AS "createdAt", updated_at AS "updatedAt"`;
const churchFields = `id, slug, name, tagline, primary_color AS "primaryColor", accent_color AS "accentColor"`;
const notFound = () => new ApiError(404, 'NOT_FOUND', 'Conteúdo não encontrado.');
const forbidden = () => new ApiError(403, 'FORBIDDEN', 'Sua função não permite esta ação.');
const unauthenticated = () => new ApiError(401, 'UNAUTHENTICATED', 'Entre novamente para continuar.');

function tokenFrom(request: FastifyRequest): string {
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(request.headers.authorization ?? '');
  if (!match) throw unauthenticated();
  return match[1]!;
}
function toPublicItem(item: Row) {
  // Do not expose a private financial ledger or artificial confirmed totals.
  const result: Row = { ...item };
  if (item.kind !== 'events') { delete result.startsAt; delete result.endsAt; delete result.location; }
  if (item.kind !== 'campaigns') delete result.goalCents;
  return result;
}
export function htmlCsp(html: string): string {
  const hashes = (tag: string) => [...html.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'gi'))]
    // HTML parsing normalizes CRLF/CR to LF before checking inline-block hashes.
    .map((match) => `'sha256-${createHash('sha256').update(match[1]!.replace(/\r\n?/g, '\n')).digest('base64')}'`).join(' ');
  return `default-src 'none'; script-src ${hashes('script')}; style-src ${hashes('style')}; style-src-attr 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`;
}

export async function createApp(db: Database, config: Config) {
  const app = Fastify({ logger: false, trustProxy: false, bodyLimit: 32768, requestTimeout: 15000, connectionTimeout: 10000 });
  const dummyHash = await hashPassword(makeToken());
  app.addHook('onRequest', async (request, reply) => {
    reply.headers({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'", 'X-Frame-Options': 'DENY' });
    const host = request.headers.host?.toLowerCase();
    const allowed = config.environment === 'production' ? [new URL(config.origin).host] : ['127.0.0.1', 'localhost', `127.0.0.1:${config.port}`, `localhost:${config.port}`];
    if (!host || !allowed.includes(host)) throw new ApiError(403, 'HOST_DENIED', 'Host não permitido.');
    if (config.environment === 'production') reply.header('Strict-Transport-Security', 'max-age=31536000');
    if (request.headers.origin && request.headers.origin !== config.origin && !(config.environment !== 'production' && request.headers.origin === `http://localhost:${config.port}`)) throw forbidden();
    if (request.headers['sec-fetch-site'] === 'cross-site') throw forbidden();
  });
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ApiError) return reply.status(error.status).send({ error: { code: error.code, message: error.message } });
    if (error instanceof ZodError) return reply.status(400).send({ error: { code: 'INVALID_INPUT', message: 'Confira os campos enviados.' } });
    const typed = error as { code?: string; statusCode?: number };
    if (typed.code === '42501') return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Ação não permitida.' } });
    if (typed.code === '23514' || typed.code === '22007' || typed.code === '22008') return reply.status(400).send({ error: { code: 'INVALID_INPUT', message: 'Confira os campos enviados.' } });
    if (typed.statusCode === 400 || typed.statusCode === 413 || typed.statusCode === 415) return reply.status(typed.statusCode).send({ error: { code: 'INVALID_REQUEST', message: 'Requisição inválida.' } });
    return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Não foi possível concluir esta ação.' } });
  });
  app.setNotFoundHandler((_request, reply) => reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Rota não encontrada.' } }));

  const getUser = async (request: FastifyRequest): Promise<User> => {
    const token = tokenFrom(request);
    const { rows } = await scoped(db, { role: 'auth' }, (tx) => tx.query<User>('SELECT * FROM church_identity.session_user($1)', [digest(token)]));
    if (!rows[0]) throw unauthenticated();
    return rows[0];
  };
  const churchBySlug = async (slug: string) => {
    const { rows } = await scoped(db, { role: 'public' }, (tx) => tx.query<Row & { id: string }>(`SELECT ${churchFields} FROM church_platform.churches WHERE slug = $1`, [slug]));
    if (!rows[0]) throw notFound();
    return rows[0];
  };
  const admin = async <T>(request: FastifyRequest, slug: string, roles: string[], fn: (tx: Queryable, churchId: string, user: User) => Promise<T>): Promise<T> => {
    const user = await getUser(request);
    const church = await churchBySlug(slug);
    return scoped(db, { role: 'member', userId: user.id, churchId: church.id }, async (tx) => {
      // This check is server-side and repeated by database RLS. Body IDs never authorize.
      const { rows } = await tx.query<{ role: string }>('SELECT role FROM church_platform.memberships WHERE church_id = $1 AND user_id = $2', [church.id, user.id]);
      if (!rows[0] || !roles.includes(rows[0].role)) throw forbidden();
      return fn(tx, church.id, user);
    });
  };

  app.get('/health', async () => {
    await scoped(db, { role: 'public' }, (tx) => tx.query('SELECT 1'));
    return { status: 'ok', service: 'church-platform', demo: config.engine === 'pglite' };
  });
  app.post('/v1/auth/login', async (request, reply) => {
    const body = z.object({ email: z.email().max(254).transform((value) => value.toLowerCase()), password: z.string().min(1).max(256) }).strict().parse(request.body);
    const allowed = await scoped(db, { role: 'auth' }, async (tx) => {
      const a = await tx.query<{ allowed: boolean }>('SELECT church_identity.allow_login($1) AS allowed', [digest(`ip:${request.ip}`)]);
      if (!a.rows[0]?.allowed) return false;
      const b = await tx.query<{ allowed: boolean }>('SELECT church_identity.allow_login($1) AS allowed', [digest(`email:${body.email}`)]);
      return b.rows[0]?.allowed;
    });
    if (!allowed) throw new ApiError(429, 'RATE_LIMITED', 'Aguarde alguns minutos antes de tentar novamente.');
    const { rows } = await scoped(db, { role: 'auth' }, (tx) => tx.query<User & { password_hash: string }>('SELECT * FROM church_identity.login_record($1)', [body.email]));
    const candidate = rows[0];
    const valid = await verifyPassword(body.password, candidate?.password_hash ?? dummyHash);
    if (!candidate || !valid) throw new ApiError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha inválidos.');
    const token = makeToken();
    const expiresAt = new Date(Date.now() + config.sessionHours * 3600000).toISOString();
    await scoped(db, { role: 'auth' }, (tx) => tx.query('SELECT church_identity.issue_session($1,$2,$3)', [candidate.id, digest(token), expiresAt]));
    reply.header('Pragma', 'no-cache');
    return { token, expiresAt, user: { id: candidate.id, email: candidate.email, name: candidate.name } };
  });
  app.get('/v1/auth/me', async (request) => {
    const user = await getUser(request);
    const { rows } = await scoped(db, { role: 'member', userId: user.id }, (tx) => tx.query(`
      SELECT c.id AS "churchId", c.slug, c.name, m.role FROM church_platform.memberships m
      JOIN church_platform.churches c ON c.id = m.church_id WHERE m.user_id = $1 ORDER BY c.slug`, [user.id]));
    return { user, memberships: rows };
  });
  app.post('/v1/auth/logout', async (request, reply) => {
    await scoped(db, { role: 'auth' }, (tx) => tx.query('SELECT church_identity.revoke_session($1)', [digest(tokenFrom(request))]));
    return reply.status(204).send();
  });
  app.get('/v1/churches/:slug', async (request) => {
    const { slug } = z.object({ slug: slugSchema }).parse(request.params);
    return { church: await churchBySlug(slug) };
  });

  for (const kind of Object.keys(schemas) as Kind[]) {
    const allowedRoles = kind === 'campaigns' ? ['owner', 'finance'] : ['owner', 'editor'];
    app.get(`/v1/churches/:slug/${kind}`, async (request) => {
      const { slug } = z.object({ slug: slugSchema }).parse(request.params);
      const church = await churchBySlug(slug);
      const { rows } = await scoped(db, { role: 'public', churchId: church.id }, (tx) => tx.query(`SELECT ${entryFields} FROM church_platform.entries WHERE kind = $1 ORDER BY created_at DESC, id LIMIT 100`, [kind]));
      return { items: rows.map(toPublicItem) };
    });
    app.get(`/v1/admin/:slug/${kind}`, async (request) => {
      const { slug } = z.object({ slug: slugSchema }).parse(request.params);
      return admin(request, slug, allowedRoles, async (tx) => {
        const { rows } = await tx.query(`SELECT ${entryFields} FROM church_platform.entries WHERE kind = $1 ORDER BY created_at DESC, id LIMIT 100`, [kind]);
        return { items: rows.map(toPublicItem) };
      });
    });
    app.post(`/v1/admin/:slug/${kind}`, async (request, reply) => {
      const { slug } = z.object({ slug: slugSchema }).parse(request.params);
      const body = schemas[kind].parse(request.body) as Record<string, unknown>;
      const result = await admin(request, slug, allowedRoles, async (tx, churchId) => {
        const entries = Object.entries(body);
        const fields = entries.map(([key]) => columns[key]!);
        const values = entries.map(([, value]) => value);
        const { rows } = await tx.query(`INSERT INTO church_platform.entries(id,church_id,kind,${fields.join(',')})
          VALUES($1,$2,$3,${values.map((_, index) => `$${index + 4}`).join(',')}) RETURNING ${entryFields}`, [randomUUID(), churchId, kind, ...values]);
        return { item: toPublicItem(rows[0]!) };
      });
      return reply.status(201).send(result);
    });
    app.patch(`/v1/admin/:slug/${kind}/:id`, async (request) => {
      const { slug, id } = z.object({ slug: slugSchema, id: idSchema }).parse(request.params);
      const body = schemas[kind].partial().refine((value) => Object.keys(value).length > 0).parse(request.body) as Record<string, unknown>;
      return admin(request, slug, allowedRoles, async (tx) => {
        const entries = Object.entries(body);
        const { rows } = await tx.query(`UPDATE church_platform.entries SET ${entries.map(([key], index) => `${columns[key]}=$${index + 3}`).join(',')}
          WHERE id=$1 AND kind=$2 RETURNING ${entryFields}`, [id, kind, ...entries.map(([, value]) => value)]);
        if (!rows[0]) throw notFound();
        return { item: toPublicItem(rows[0]) };
      });
    });
    app.delete(`/v1/admin/:slug/${kind}/:id`, async (request, reply) => {
      const { slug, id } = z.object({ slug: slugSchema, id: idSchema }).parse(request.params);
      await admin(request, slug, allowedRoles, async (tx) => {
        const { rows } = await tx.query('DELETE FROM church_platform.entries WHERE id=$1 AND kind=$2 RETURNING id', [id, kind]);
        if (!rows[0]) throw notFound();
      });
      return reply.status(204).send();
    });
  }
  app.get('/v1/admin/:slug/branding', async (request) => {
    const { slug } = z.object({ slug: slugSchema }).parse(request.params);
    return admin(request, slug, ['owner'], async (tx, churchId) => {
      const { rows } = await tx.query(`SELECT ${churchFields} FROM church_platform.churches WHERE id=$1`, [churchId]);
      return { item: rows[0] };
    });
  });
  app.patch('/v1/admin/:slug/branding', async (request) => {
    const { slug } = z.object({ slug: slugSchema }).parse(request.params);
    const body = z.object({ name: z.string().trim().min(2).max(120), tagline: z.string().max(240), primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/), accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/) }).partial().strict()
      .refine((value) => Object.keys(value).length > 0).parse(request.body);
    const names: Record<string, string> = { name: 'name', tagline: 'tagline', primaryColor: 'primary_color', accentColor: 'accent_color' };
    return admin(request, slug, ['owner'], async (tx, churchId) => {
      const entries = Object.entries(body);
      const { rows } = await tx.query(`UPDATE church_platform.churches SET ${entries.map(([key], index) => `${names[key]}=$${index + 2}`).join(',')} WHERE id=$1 RETURNING ${churchFields}`, [churchId, ...entries.map(([, value]) => value)]);
      if (!rows[0]) throw notFound();
      return { item: rows[0] };
    });
  });
  app.get('/v1/admin/:slug/audit', async (request) => {
    const { slug } = z.object({ slug: slugSchema }).parse(request.params);
    return admin(request, slug, ['owner'], async (tx) => {
      const { rows } = await tx.query(`SELECT id::text, church_id AS "churchId", actor_id AS "actorId", action, entity_type AS "entityType", entity_id AS "entityId", changes, created_at AS "createdAt" FROM church_platform.audit_events ORDER BY created_at DESC,id DESC LIMIT 100`);
      return { items: rows };
    });
  });
  if (config.environment === 'development') {
    for (const [route, file] of [['/console', 'console.html'], ['/projeto', 'projeto.html']] as const) {
      app.get(route, async (_request, reply) => {
        try {
          const html = await readFile(new URL(`../../deliverables/saas-igrejas/${file}`, import.meta.url), 'utf8');
          return reply.header('Content-Security-Policy', htmlCsp(html)).type('text/html; charset=utf-8').send(html);
        } catch { throw notFound(); }
      });
    }
  }
  return app;
}
