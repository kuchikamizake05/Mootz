import {randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {it,expect} from 'vitest';
import {migrate} from '../src/db/migrate.ts';
import {createProfileRepository} from '../src/profile/repository.ts';
it('persists private preferences, history and concurrent identity atomically',async()=>{
 if(!process.env.TEST_DATABASE_URL) throw Error('TEST_DATABASE_URL required');
 const pool=new Pool({connectionString:process.env.TEST_DATABASE_URL});
 const subject=`integration:${randomUUID()}`;
 try {
  await migrate(pool);
  const repo=createProfileRepository(pool);
  const accounts=await Promise.all(Array.from({length:5},()=>repo.getOrCreate(subject)));
  expect(new Set(accounts.map(a=>a.id)).size).toBe(1);
  expect(accounts[0]!.wallet).toBeNull();
  const changed=await repo.updatePreferences(subject,false);
  expect(changed.recordMeet).toBe(false);
  await repo.updatePreferences(subject,false);
  expect((await pool.query('SELECT * FROM preference_history WHERE account_id=$1',[changed.id])).rowCount).toBe(1);
  expect((await repo.getOrCreate(subject)).recordMeet).toBe(false);
  const completed=await repo.completeOnboarding(subject);
  expect(completed.onboardingCompletedAt).toBeTruthy();
  expect((await repo.completeOnboarding(subject)).onboardingCompletedAt).toBe(completed.onboardingCompletedAt);
 } finally {
  await pool.query('DELETE FROM preference_history WHERE account_id IN (SELECT id FROM accounts WHERE provider_subject=$1)',[subject]);
  await pool.query('DELETE FROM onchain_preferences WHERE account_id IN (SELECT id FROM accounts WHERE provider_subject=$1)',[subject]);
  await pool.query('DELETE FROM accounts WHERE provider_subject=$1',[subject]);
  await pool.end();
 }
});
