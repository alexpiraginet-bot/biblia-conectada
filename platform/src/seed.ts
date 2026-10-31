import { randomUUID, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Database } from './db.js';
import { hashPassword } from './password.js';

export interface DemoAccount { email: string; password: string; role: 'owner' | 'editor' | 'finance'; churchSlug: string }
export interface DemoCredentials { accounts: DemoAccount[] }

/** Local only. Never overwrite existing accounts or regenerate a lost password file. */
export async function seedDemo(db: Database, credentialsPath?: string): Promise<DemoCredentials> {
  if (!db.local || process.env.NODE_ENV === 'production') throw new Error('Demo seed is local development only');
  const existing = await db.query<{ count: string }>('SELECT count(*)::text AS count FROM church_identity.users');
  if (existing.rows[0]?.count !== '0') {
    if (!credentialsPath) throw new Error('Existing database: seed will not replace passwords');
    try { return JSON.parse(await readFile(credentialsPath, 'utf8')) as DemoCredentials; }
    catch { throw new Error('Existing accounts preserved; demo credentials file is absent. No password was reset.'); }
  }
  const accounts: DemoAccount[] = [];
  const churches = [
    { slug: 'comunidade-esperanca', name: 'Comunidade Esperança · Demonstração', color: '#371D2D' },
    { slug: 'igreja-caminho', name: 'Igreja Caminho · Demonstração', color: '#182E46' },
  ];
  const prepared: Array<{ slug: string; name: string; color: string; id: string; users: Array<DemoAccount & { id: string; passwordHash: string }> }> = [];
  for (const church of churches) {
    const id = randomUUID();
    const users = [];
    for (const role of ['owner', 'editor', 'finance'] as const) {
      const account = { email: `${role}@${church.slug}.example`, password: randomBytes(24).toString('base64url'), role, churchSlug: church.slug };
      accounts.push(account);
      users.push({ ...account, id: randomUUID(), passwordHash: await hashPassword(account.password) });
    }
    prepared.push({ ...church, id, users });
  }
  // Write before committing so a failed filesystem write never creates unknown credentials.
  // wx also refuses to silently replace an existing credentials file.
  if (credentialsPath) {
    await mkdir(dirname(credentialsPath), { recursive: true });
    await writeFile(credentialsPath, `${JSON.stringify({ accounts }, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  }
  await db.transaction(async (tx) => {
    for (const church of prepared) {
      await tx.query('INSERT INTO church_platform.churches(id,slug,name,tagline,primary_color) VALUES($1,$2,$3,$4,$5)',
        [church.id, church.slug, church.name, 'Uma comunidade fictícia para testar a plataforma.', church.color]);
      for (const user of church.users) {
        await tx.query('INSERT INTO church_identity.users(id,email,name,password_hash) VALUES($1,$2,$3,$4)',
          [user.id, user.email, `${user.role} · ${church.name}`, user.passwordHash]);
        await tx.query('INSERT INTO church_platform.memberships(church_id,user_id,role) VALUES($1,$2,$3)', [church.id, user.id, user.role]);
      }
      await tx.query(`INSERT INTO church_platform.entries(id,church_id,kind,title,body,status) VALUES
        ($1,$2,'posts',$3,$4,'published'), ($5,$2,'posts',$6,$7,'draft')`,
        [randomUUID(), church.id, `Bem-vindo à ${church.name}`, 'Este aviso é público. Todos os dados desta igreja são fictícios.',
          randomUUID(), 'Planejamento interno da semana', 'Rascunho privado da equipe desta igreja.']);
      await tx.query(`INSERT INTO church_platform.entries(id,church_id,kind,title,body,status,starts_at,ends_at,location)
        VALUES($1,$2,'events','Encontro da comunidade','Evento fictício de demonstração.','published',$3,$4,'Local a confirmar')`,
        [randomUUID(), church.id, '2026-11-08T13:00:00Z', '2026-11-08T14:00:00Z']);
      await tx.query(`INSERT INTO church_platform.entries(id,church_id,kind,title,body,status,goal_cents)
        VALUES($1,$2,'campaigns','Biblioteca comunitária','Campanha fictícia. Nenhum pagamento está ativo.','draft',500000)`, [randomUUID(), church.id]);
    }
  });
  return { accounts };
}
