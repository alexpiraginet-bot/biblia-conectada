import { PGlite } from '@electric-sql/pglite';
import { Pool } from 'pg';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import type { Config } from './config.js';

export type Row = Record<string, unknown>;
export interface Queryable {
  query<T extends Row = Row>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  exec(sql: string): Promise<void>;
}
export interface Database extends Queryable {
  transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>;
  close(): Promise<void>;
  local: boolean;
}
type Scope = { role: 'public' | 'member' | 'auth'; userId?: string; churchId?: string };
const roles = { public: 'bc_platform_public', member: 'bc_platform_member', auth: 'bc_platform_auth' } as const;

export async function openDatabase(config: Pick<Config, 'engine' | 'dataDir' | 'databaseUrl'>): Promise<Database> {
  if (config.engine === 'pglite') {
    if (config.dataDir !== 'memory://') await mkdir(dirname(config.dataDir), { recursive: true });
    const engine = new PGlite(config.dataDir === 'memory://' ? 'memory://' : config.dataDir);
    await engine.waitReady;
    const wrap = (client: Pick<PGlite, 'query' | 'exec'>): Queryable => ({
      query: async <T extends Row>(sql: string, params: unknown[] = []) => client.query<T>(sql, params),
      exec: async (sql) => { await client.exec(sql); },
    });
    return {
      ...wrap(engine), local: true,
      transaction: (fn) => engine.transaction((tx) => fn(wrap(tx))),
      close: () => engine.close(),
    };
  }
  const pool = new Pool({ connectionString: config.databaseUrl, max: 8, connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000, statement_timeout: 10000, application_name: 'bc-church-platform' });
  return {
    local: false,
    query: async <T extends Row>(sql: string, params: unknown[] = []) => pool.query<T>(sql, params),
    exec: async (sql) => { await pool.query(sql); },
    transaction: async (fn) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn({ query: (sql, params) => client.query(sql, params), exec: async (sql) => { await client.query(sql); } });
        await client.query('COMMIT');
        return result;
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    },
    close: () => pool.end(),
  };
}

/** Every request uses one transaction and one checked-out connection. No session leakage. */
export function scoped<T>(db: Database, scope: Scope, fn: (tx: Queryable) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec(`SET LOCAL ROLE ${roles[scope.role]}`);
    await tx.query("SELECT set_config('app.user_id', $1, true), set_config('app.church_id', $2, true)",
      [scope.userId ?? '', scope.churchId ?? '']);
    return fn(tx);
  });
}

export async function migrate(db: Database): Promise<void> {
  await db.exec('CREATE TABLE IF NOT EXISTS public.bc_platform_migrations (name text PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
  const directory = fileURLToPath(new URL('../migrations/', import.meta.url));
  for (const name of (await readdir(directory)).filter((name) => /^\d+_[a-z0-9_]+\.sql$/.test(name)).sort()) {
    const sql = await readFile(`${directory}/${name}`, 'utf8');
    const digest = createHash('sha256').update(sql).digest('hex');
    await db.transaction(async (tx) => {
      await tx.exec('LOCK TABLE public.bc_platform_migrations IN EXCLUSIVE MODE');
      const existing = await tx.query<{ sha256: string }>('SELECT sha256 FROM public.bc_platform_migrations WHERE name = $1', [name]);
      if (existing.rows[0]) {
        if (existing.rows[0].sha256 !== digest) throw new Error(`Applied migration changed: ${name}`);
        return;
      }
      await tx.exec(sql);
      await tx.query('INSERT INTO public.bc_platform_migrations(name, sha256) VALUES($1, $2)', [name, digest]);
    });
  }
}

/** PGlite is development only. Requests still run with real non-superuser roles. */
export async function restrictLocalRuntime(db: Database): Promise<void> {
  if (!db.local) throw new Error('Local role bootstrap is not allowed on PostgreSQL');
  await db.exec(`DO $$ BEGIN
    IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname = 'bc_platform_local') THEN
      CREATE ROLE bc_platform_local NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
    END IF;
  END $$;
  GRANT bc_platform_public, bc_platform_member, bc_platform_auth TO bc_platform_local;
  SET SESSION AUTHORIZATION bc_platform_local;`);
}

export async function assertRuntimePrivileges(db: Database): Promise<void> {
  const { rows } = await db.query<{ unsafe: boolean }>(`
    SELECT EXISTS (
      SELECT 1 FROM pg_roles r WHERE
        (r.rolname = session_user OR pg_has_role(session_user, r.oid, 'MEMBER'))
        AND (r.rolsuper OR r.rolbypassrls OR r.rolcreaterole OR r.rolcreatedb OR r.rolreplication)
    ) OR EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname IN ('church_platform', 'church_identity')
        AND pg_has_role(session_user, c.relowner, 'MEMBER')
    ) OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname = session_user AND rolinherit) AS unsafe`);
  if (rows[0]?.unsafe !== false) throw new Error('Unsafe database runtime privileges');
  for (const role of Object.keys(roles) as Scope['role'][]) {
    await scoped(db, { role }, async (tx) => {
      const result = await tx.query<{ unsafe: boolean }>('SELECT rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication AS unsafe FROM pg_roles WHERE rolname = current_user');
      if (result.rows[0]?.unsafe !== false) throw new Error('Unsafe request role');
    });
  }
}
