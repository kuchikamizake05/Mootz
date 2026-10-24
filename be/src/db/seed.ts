import type { Pool } from 'pg';
/** Synthetic demo identities cannot authenticate through the production verifier. */
export async function seed(pool: Pool): Promise<void> {
 const client = await pool.connect();
 try {
  await client.query('BEGIN');
  for (const [subject,name] of [['demo-only:poster','Demo Poster'],['demo-only:scanner','Demo Scanner']]) {
   const result = await client.query<{id:string}>('INSERT INTO accounts(provider_subject,display_name) VALUES($1,$2) ON CONFLICT(provider_subject) DO UPDATE SET provider_subject=EXCLUDED.provider_subject RETURNING id',[subject,name]);
   await client.query('INSERT INTO onchain_preferences(account_id) VALUES($1) ON CONFLICT DO NOTHING',[result.rows[0]!.id]);
  }
  await client.query(`INSERT INTO friendships(account_low,account_high,requested_by,status)
   SELECT LEAST(a.id,b.id),GREATEST(a.id,b.id),a.id,'accepted'
   FROM accounts a CROSS JOIN accounts b
   WHERE a.provider_subject='demo-only:poster' AND b.provider_subject='demo-only:scanner'
   ON CONFLICT(account_low,account_high) DO NOTHING`);
  await client.query(`INSERT INTO events(id,organizer_id,title,description,starts_at,ends_at,location_label)
   SELECT '00000000-0000-4000-8000-000000000001',id,'Demo Workshop A',
   'Synthetic fixture only; fixed demo schedule, not a real event.',
   '2026-10-24T02:00:00Z','2026-10-24T05:00:00Z','Synthetic demo venue'
   FROM accounts WHERE provider_subject='demo-only:poster'
   ON CONFLICT(id) DO NOTHING`);
  await client.query('COMMIT');
 } catch (error) { await client.query('ROLLBACK'); throw error; }
 finally { client.release(); }
}
