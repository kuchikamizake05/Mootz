import type { Pool, PoolClient } from 'pg';
import type { Profile, ProfileRepository } from './routes.ts';
export function createProfileRepository(pool: Pool, chainId = 10143): ProfileRepository {
 async function transaction(subject: string, change?: (client: PoolClient, id: string) => Promise<void>): Promise<Profile> {
  const client = await pool.connect();
  try {
   await client.query('BEGIN');
   const account = await client.query<{id:string}>('INSERT INTO accounts(provider_subject) VALUES ($1) ON CONFLICT(provider_subject) DO UPDATE SET provider_subject=EXCLUDED.provider_subject RETURNING id', [subject]);
   const id = account.rows[0]!.id;
   await client.query('INSERT INTO onchain_preferences(account_id) VALUES ($1) ON CONFLICT DO NOTHING', [id]);
   await client.query('SELECT account_id FROM onchain_preferences WHERE account_id=$1 FOR UPDATE', [id]);
   if (change) await change(client,id);
   const result = await client.query<{record_meet:boolean;onboarding_completed_at:Date|null}>('SELECT record_meet,onboarding_completed_at FROM onchain_preferences WHERE account_id=$1',[id]);
   const username = await client.query<{username:string|null}>('SELECT username FROM accounts WHERE id=$1',[id]);
   const binding = await client.query<{address:string}>('SELECT address FROM wallet_bindings WHERE account_id=$1 AND chain_id=$2 AND revoked_at IS NULL', [id,chainId]);
   await client.query('COMMIT');
   return {id,recordMeet:result.rows[0]!.record_meet,onboardingCompletedAt:result.rows[0]!.onboarding_completed_at?.toISOString() ?? null,wallet:binding.rows[0]?.address ?? null,username:username.rows[0]!.username};
  } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
 }
 return {
  getOrCreate: subject => transaction(subject),
  updatePreferences: (subject, value) => transaction(subject,async(client,id)=>{
   await client.query('INSERT INTO preference_history(account_id,old_value,new_value) SELECT account_id,record_meet,$2 FROM onchain_preferences WHERE account_id=$1 AND record_meet IS DISTINCT FROM $2',[id,value]);
   await client.query('UPDATE onchain_preferences SET record_meet=$2,updated_at=now() WHERE account_id=$1',[id,value]);
  }),
  setUsername: (subject, username) => transaction(subject,async(client,id)=>{
   try { await client.query('UPDATE accounts SET username=$2 WHERE id=$1',[id,username]); }
   catch(error) { if ((error as {code?:string}).code==='23505') throw Object.assign(new Error('Username taken'),{statusCode:409,code:'USERNAME_TAKEN'}); throw error; }
  }),
  completeOnboarding: subject => transaction(subject, async(client,id)=>{await client.query('UPDATE onchain_preferences SET onboarding_completed_at=COALESCE(onboarding_completed_at,now()),updated_at=now() WHERE account_id=$1',[id]);}),
 };
}
