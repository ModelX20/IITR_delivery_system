// Runs a local PostgreSQL 16 server without Docker or a system install.
// Data is kept in server/.pgdata. Stop with Ctrl+C.
// If you use docker-compose.yml instead, you don't need this script.
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DATABASES = ['iitr_delivery', 'iitr_delivery_test'];
const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.pgdata');
const isFirstRun = !existsSync(dataDir);

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'postgres',
  password: 'postgres',
  port: 5432,
  persistent: true,
});

async function main() {
  if (isFirstRun) {
    console.log('Initialising a new Postgres data directory…');
    await pg.initialise();
  }
  await pg.start();

  const client = pg.getPgClient();
  await client.connect();
  for (const name of DATABASES) {
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    if (!rowCount) {
      await pg.createDatabase(name);
      console.log(`Created database ${name}`);
    }
  }
  await client.end();

  console.log('Postgres 16 is running on postgresql://postgres:postgres@localhost:5432 (Ctrl+C to stop)');
}

async function shutdown() {
  console.log('\nStopping Postgres…');
  await pg.stop();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main().catch(async (err) => {
  console.error('Failed to start Postgres:', err);
  await pg.stop().catch(() => {});
  process.exit(1);
});
