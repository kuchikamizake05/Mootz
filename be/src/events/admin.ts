import type { Pool } from 'pg';

/** Operator-only database operation; never exposed through the HTTP API. */
export async function setOrganizer(pool: Pool, accountId: string, enabled: boolean): Promise<void> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(accountId)) throw Error('Expected account UUID');
  if (enabled) {
    await pool.query('INSERT INTO event_organizers(account_id) VALUES($1) ON CONFLICT DO NOTHING', [accountId]);
  } else {
    await pool.query('DELETE FROM event_organizers WHERE account_id=$1', [accountId]);
  }
}
