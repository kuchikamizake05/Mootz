import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import type { Pool } from 'pg';
const directory = new URL('../../migrations/', import.meta.url);
export async function migrate(pool: Pool): Promise<void> {
 const client = await pool.connect();
 try {
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(673912401)');
  await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
  const files = (await readdir(directory)).filter(name => /^\d+_[a-z_]+\.sql$/.test(name)).sort();
  for (const version of files) {
   const sql = await readFile(new URL(version, directory),'utf8');
   const checksum = createHash('sha256').update(sql.replace(/\r\n/g,'\n')).digest('hex');
   const applied = await client.query<{checksum: string}>('SELECT checksum FROM schema_migrations WHERE version=$1',[version]);
   if (applied.rows[0]) {
    if (applied.rows[0].checksum !== checksum) {
     // Upgrade the previous raw-byte checksum only when the current file still matches it.
     const legacyChecksums=[sql,sql.replace(/\r\n/g,'\n').replace(/\n/g,'\r\n')].map(text=>createHash('sha256').update(text).digest('hex'));
     if(!legacyChecksums.includes(applied.rows[0].checksum))throw new Error(`Migration checksum mismatch: ${version}`);
     await client.query('UPDATE schema_migrations SET checksum=$1 WHERE version=$2',[checksum,version]);
    }
    continue;
   }
   await client.query(sql);
   await client.query('INSERT INTO schema_migrations(version,checksum) VALUES($1,$2)',[version,checksum]);
  }
  await client.query('COMMIT');
 } catch (error) { await client.query('ROLLBACK'); throw error; }
 finally { client.release(); }
}
