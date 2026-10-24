import { Pool } from 'pg';
import { loadConfig } from '../config.ts';
import { migrate } from './migrate.ts';
import { seed } from './seed.ts';

async function main() {
  const command = process.argv[2];
  if (command !== 'migrate' && command !== 'seed') throw new Error('Expected migrate or seed');
  const config = loadConfig(process.env);
  const pool = new Pool({ connectionString: config.databaseUrl, connectionTimeoutMillis: 2000 });
  try {
    await migrate(pool);
    if (command === 'seed') {
      if (process.env.NODE_ENV === 'production') throw new Error('Demo seed is disabled in production');
      await seed(pool);
    }
    process.stdout.write(`Database ${command} complete\n`);
  } finally { await pool.end(); }
}
main().catch(() => {
  process.stderr.write('Database command failed; inspect configuration and migration state\n');
  process.exitCode = 1;
});
