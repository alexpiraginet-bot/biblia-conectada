import { resolve } from 'node:path';
import { loadConfig } from './config.js';
import { openDatabase, migrate } from './db.js';
import { seedDemo } from './seed.js';

async function main() {
  const command = process.argv[2];
  const config = loadConfig();
  if (!['migrate', 'seed', 'setup'].includes(command ?? '')) throw new Error('Use migrate, seed or setup');
  if (command !== 'migrate' && (config.environment !== 'development' || config.engine !== 'pglite')) {
    throw new Error('setup/seed only accept local PGlite development');
  }
  if (config.engine === 'pg' && !config.migrationUrl) throw new Error('MIGRATION_DATABASE_URL is required for migrations');
  const db = await openDatabase({ ...config, databaseUrl: config.migrationUrl ?? config.databaseUrl });
  try {
    if (command === 'migrate' || command === 'setup') await migrate(db);
    if (command === 'seed' || command === 'setup') await seedDemo(db, resolve('.local/demo-credentials.json'));
    console.log(command === 'migrate' ? 'Migrations applied.' : 'Local demonstration ready. Credentials: .local/demo-credentials.json (not printed).');
  } finally { await db.close(); }
}
try { await main(); }
catch {
  // Provider exceptions may contain SQL parameters or connection secrets.
  console.error('Setup/migration failed. Check README prerequisites, database privileges and the local credentials file. No existing password was reset.');
  process.exitCode = 1;
}
