import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { expect, it } from 'vitest';

it('preserves an existing Event frame and timestamp when migrating to the unified slot', async () => {
 const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
 const client = await pool.connect();
 const schema = 'frame_migration_' + crypto.randomUUID().replaceAll('-','');
 try {
  await client.query('BEGIN');
  await client.query(`CREATE SCHEMA ${schema}`);
  await client.query(`SET LOCAL search_path TO ${schema}`);
  await client.query('CREATE TABLE accounts(id uuid PRIMARY KEY); CREATE TABLE event_collections(id uuid PRIMARY KEY); CREATE TABLE collection_equips(account_id uuid PRIMARY KEY,collection_ref uuid NOT NULL,equipped_at timestamptz NOT NULL)');
  const account=crypto.randomUUID(), collection=crypto.randomUUID(), at=new Date('2026-10-23T00:00:00Z');
  await client.query('INSERT INTO accounts VALUES($1)',[account]);
  await client.query('INSERT INTO event_collections VALUES($1)',[collection]);
  await client.query('INSERT INTO collection_equips VALUES($1,$2,$3)',[account,collection,at]);
  await client.query(await readFile(new URL('../migrations/013_frames.sql',import.meta.url),'utf8'));
  const migrated=await client.query('SELECT account_id,collection_ref,equipped_at FROM profile_frames');
  expect(migrated.rows).toEqual([{account_id:account,collection_ref:collection,equipped_at:at}]);
  expect((await client.query('SELECT * FROM collection_equips')).rows).toEqual(migrated.rows);
  await client.query('DELETE FROM collection_equips WHERE account_id=$1',[account]);
  expect((await client.query('SELECT * FROM profile_frames')).rowCount).toBe(0);
 } finally {
  await client.query('ROLLBACK');
  client.release();
  await pool.end();
 }
});
