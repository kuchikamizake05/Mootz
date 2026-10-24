import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { loadConfig } from '../config.ts';
import { setOrganizer } from './admin.ts';
import { mapCollection } from './map-collection.ts';

async function main() {
  const [command, value, ...extra] = process.argv.slice(2);
  if (!value || extra.length || !['grant', 'revoke', 'map-collection'].includes(command ?? '')) {
    throw Error('Usage: events:admin grant|revoke <account-uuid> OR map-collection <public-json-file>');
  }
  const config = loadConfig(process.env);
  const pool = new Pool({ connectionString: config.databaseUrl, connectionTimeoutMillis: 3000 });
  try {
    if (command === 'map-collection') {
      if (!config.collection) throw Error('Collection RPC/address must be configured');
      await mapCollection(pool, JSON.parse(await readFile(value, 'utf8')), config.collection);
    } else await setOrganizer(pool, value, command === 'grant');
    process.stdout.write('Event administration completed\n');
  } finally { await pool.end(); }
}

main().catch(() => {
  // Provider/driver errors can contain connection credentials or private configuration.
  process.stderr.write('Event administration failed. Check arguments, migrations, account, collection configuration and finalized receipt.\n');
  process.exitCode = 1;
});
