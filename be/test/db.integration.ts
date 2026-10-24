import { expect, it } from 'vitest';
import { Pool } from 'pg';
import { migrate } from '../src/db/migrate.ts';
import { seed } from '../src/db/seed.ts';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
function testPool(): Pool {
 const connectionString = process.env.TEST_DATABASE_URL;
 if (!connectionString) throw new Error('TEST_DATABASE_URL is required for database integration');
 return new Pool({connectionString});
}
it('stores portable migration checksums independent of Windows line endings',async()=>{
 const pool=testPool();
 try{
  await migrate(pool);
  const sql=await readFile(new URL('../migrations/001_identity.sql',import.meta.url),'utf8');
  const canonical=createHash('sha256').update(sql.replace(/\r\n/g,'\n')).digest('hex');
  expect((await pool.query("SELECT checksum FROM schema_migrations WHERE version='001_identity.sql'")).rows[0].checksum).toBe(canonical);
  const windowsChecksum=createHash('sha256').update(sql.replace(/\r\n/g,'\n').replace(/\n/g,'\r\n')).digest('hex');
  await pool.query("UPDATE schema_migrations SET checksum=$1 WHERE version='001_identity.sql'",[windowsChecksum]);
  await migrate(pool);
  expect((await pool.query("SELECT checksum FROM schema_migrations WHERE version='001_identity.sql'")).rows[0].checksum).toBe(canonical);
 }finally{await pool.end();}
});
it('migrates repeatedly and seeds synthetic accounts without wallet bindings', async () => {
 const pool = testPool();
 try {
 await migrate(pool); await migrate(pool); await seed(pool); await seed(pool);
 const result = await pool.query("SELECT a.provider_subject,p.record_meet FROM accounts a JOIN onchain_preferences p ON p.account_id=a.id WHERE provider_subject LIKE 'demo-only:%'");
 expect((await pool.query("SELECT * FROM events WHERE id='00000000-0000-4000-8000-000000000001' AND title='Demo Workshop A'")).rows).toHaveLength(1);
 expect((await pool.query("SELECT f.* FROM friendships f JOIN accounts a ON a.id=f.account_low JOIN accounts b ON b.id=f.account_high WHERE a.provider_subject LIKE 'demo-only:%' AND b.provider_subject LIKE 'demo-only:%' AND f.status='accepted'")).rows).toHaveLength(1);
 expect(result.rows).toHaveLength(2); expect(result.rows.every(r => r.record_meet)).toBe(true);
 expect((await pool.query("SELECT * FROM wallet_bindings w JOIN accounts a ON a.id=w.account_id WHERE a.provider_subject LIKE 'demo-only:%'")).rows).toHaveLength(0);
 } finally { await pool.end(); }
});
it('rejects altered migration history without changing schema', async () => {
 const pool = testPool();
 try {
 await migrate(pool);
 const original = await pool.query<{checksum:string}>("SELECT checksum FROM schema_migrations WHERE version='001_identity.sql'");
 try {
 await pool.query("UPDATE schema_migrations SET checksum='tampered' WHERE version='001_identity.sql'");
 await expect(migrate(pool)).rejects.toThrow('checksum mismatch');
 } finally { await pool.query("UPDATE schema_migrations SET checksum=$1 WHERE version='001_identity.sql'",[original.rows[0]!.checksum]); }
 } finally { await pool.end(); }
});
it('enforces unique provider subjects and rejects self friendships', async () => {
 const pool = testPool();
 try {
 await migrate(pool); await seed(pool);
 await expect(pool.query("INSERT INTO accounts(provider_subject) VALUES('demo-only:poster')")).rejects.toMatchObject({code:'23505'});
 const account = await pool.query<{id:string}>("SELECT id FROM accounts WHERE provider_subject='demo-only:poster'");
 await expect(pool.query("INSERT INTO friendships(account_low,account_high,requested_by,status) VALUES($1,$1,$1,'accepted')",[account.rows[0]!.id])).rejects.toMatchObject({code:'23514'});
 } finally { await pool.end(); }
});
