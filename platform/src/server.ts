import { loadConfig } from './config.js';
import { openDatabase, restrictLocalRuntime, assertRuntimePrivileges } from './db.js';
import { createApp } from './app.js';

const config = loadConfig();
const db = await openDatabase(config);
try {
  if (db.local) await restrictLocalRuntime(db);
  await assertRuntimePrivileges(db);
  const app = await createApp(db, config);
  app.addHook('onClose', () => db.close());
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void app.close(); });
  await app.listen({ host: config.host, port: config.port });
  console.log(`Church platform listening on ${config.environment === 'production' ? config.origin : `http://127.0.0.1:${config.port}/console`}`);
} catch (error) {
  await db.close();
  // Startup errors can contain a database URL or SQL parameters. Never print them.
  console.error('Platform failed to start. Check configuration, migrations and runtime privileges.');
  process.exitCode = 1;
}
