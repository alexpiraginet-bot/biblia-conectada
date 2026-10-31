import { resolve } from 'node:path';
import { z } from 'zod';

export interface Config {
  environment: 'development' | 'test' | 'production';
  engine: 'pglite' | 'pg';
  host: string;
  port: number;
  dataDir: string;
  databaseUrl?: string;
  migrationUrl?: string;
  origin: string;
  sessionHours: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const environment = z.enum(['development', 'test', 'production']).parse(env.NODE_ENV ?? 'development');
  const engine = z.enum(['pglite', 'pg']).parse(env.DB_ENGINE ?? 'pglite');
  const port = z.coerce.number().int().min(1024).max(65535).parse(env.PORT ?? 4318);
  const host = env.HOST ?? '127.0.0.1';
  const origin = env.PUBLIC_ORIGIN ?? `http://127.0.0.1:${port}`;
  const parsed = new URL(origin);
  if (parsed.origin !== origin || parsed.username || parsed.password) throw new Error('PUBLIC_ORIGIN must be an origin');
  if (environment !== 'production' && host !== '127.0.0.1') throw new Error('Development must bind to 127.0.0.1');
  if (environment === 'production') {
    if (engine !== 'pg' || !env.DATABASE_URL) throw new Error('Production requires PostgreSQL runtime credentials');
    if (env.DEMO_SEED === 'true') throw new Error('Demo seed is prohibited in production');
    if (parsed.protocol !== 'https:') throw new Error('Production requires HTTPS PUBLIC_ORIGIN');
  }
  if (engine === 'pg' && !env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  return {
    environment, engine, host, port, origin,
    dataDir: resolve(env.PGLITE_DIR ?? '.local/database'),
    databaseUrl: env.DATABASE_URL,
    migrationUrl: env.MIGRATION_DATABASE_URL,
    sessionHours: z.coerce.number().int().min(1).max(24).parse(env.SESSION_TTL_HOURS ?? 8),
  };
}
