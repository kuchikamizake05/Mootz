import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { Pool } from 'pg';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { registerMeetRoutes } from '../src/meet/routes.ts';
import { migrate } from '../src/db/migrate.ts';
import { meetTypes, hashOffer } from '../src/protocol/index.ts';
const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
const wallets = [privateKeyToAccount(generatePrivateKey()), privateKeyToAccount(generatePrivateKey()), privateKeyToAccount(generatePrivateKey())];
const subjects = wallets.map(() => `meet-test:${crypto.randomUUID()}`);
const ids: string[] = []; const moments: string[] = [];
let clock = new Date('2026-10-23T05:00:00Z');
let readDelayMs=0;
let timeSequence:Date[]=[];
vi.setConfig({testTimeout:30000,hookTimeout:30000});
const domain = { chainId: 10143, verifyingContract: '0x1111111111111111111111111111111111111111' as const };
const app = Fastify();
registerMeetRoutes(app, { pool, domain, now: () => timeSequence.shift()??clock, storage: { signRead: async key => `https://private.invalid/${key}`, read: async()=>{clock=new Date(clock.getTime()+readDelayMs);return Buffer.from('synthetic-jpeg');} }, verifyToken: async token => { if (!subjects.includes(token)) throw Error(); return { subject: token }; } });
const headers = (i = 0) => ({ authorization: `Bearer ${subjects[i]}` });
const sample = (latitude = 0) => ({ latitude, longitude: 0, accuracyMeters: 5, capturedAtMs: clock.getTime() });
beforeAll(async () => {
  await migrate(pool);
  for (let i = 0; i < wallets.length; i++) {
    const id = (await pool.query<{id:string}>('INSERT INTO accounts(provider_subject) VALUES($1) RETURNING id', [subjects[i]])).rows[0]!.id; ids.push(id);
    await pool.query('INSERT INTO onchain_preferences(account_id) VALUES($1)', [id]);
    await pool.query('INSERT INTO wallet_bindings(account_id,chain_id,address,verified_at) VALUES($1,10143,$2,now())', [id, wallets[i]!.address.toLowerCase()]);
  }
  const id = (await pool.query<{id:string}>("INSERT INTO moments(author_id,source,published_at,pair_commitment,commitment_salt) VALUES($1,'capture',$2,$3,$3) RETURNING id", [ids[0], clock, 'ab'.repeat(32)])).rows[0]!.id; moments.push(id);
  for (const side of ['front','back']) await pool.query('INSERT INTO moment_media(moment_id,side,image_key,thumbnail_key,sha256,thumbnail_sha256,width,height) VALUES($1,$2,$3,$4,$5,$5,10,10)', [id,side,`${id}/${side}`,`${id}/${side}-thumb`,'cd'.repeat(32)]);
});
afterAll(async () => {
  await app.close();
  for (const table of ['meet_outbox','dots']) await pool.query(`DELETE FROM ${table} WHERE meet_id IN(SELECT id FROM meets WHERE poster_id=ANY($1::uuid[]))`, [ids]);
  await pool.query('DELETE FROM meets WHERE poster_id=ANY($1::uuid[])', [ids]); await pool.query('DELETE FROM meet_offers WHERE poster_id=ANY($1::uuid[])', [ids]);
  await pool.query('DELETE FROM moment_media WHERE moment_id=ANY($1::uuid[])', [moments]); await pool.query('DELETE FROM moments WHERE id=ANY($1::uuid[])', [moments]);
  for (const table of ['wallet_bindings','onchain_preferences']) await pool.query(`DELETE FROM ${table} WHERE account_id=ANY($1::uuid[])`, [ids]);
  await pool.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])', [ids]); await pool.end();
});
async function offer() {
  const response = await app.inject({ method:'POST',url:'/v1/meet/offers',headers:headers(),payload:{momentId:moments[0]} }); expect(response.statusCode).toBe(201);
  const data = response.json(); const message = {...data.offer,issuedAt:BigInt(data.offer.issuedAt),expiresAt:BigInt(data.offer.expiresAt)};
  const signature = await wallets[0]!.signTypedData({domain:data.domain,types:meetTypes,primaryType:'MeetOffer',message});
  expect((await app.inject({method:'PUT',url:`/v1/meet/offers/${data.id}/signature`,headers:headers(),payload:{signature}})).statusCode).toBe(200);
  return {...data,signature,digest:hashOffer(data.domain,message)};
}
async function acceptance(data: Awaited<ReturnType<typeof offer>>, i=1, latitude=0) {
  const preview = await app.inject({method:'POST',url:`/v1/meet/offers/${data.id}/preview`,headers:headers(i),payload:{offerDigest:data.digest,posterSignature:data.signature}}); expect(preview.statusCode).toBe(200);
  const accept = preview.json().acceptance;
  const signature = await wallets[i]!.signTypedData({domain:data.domain,types:meetTypes,primaryType:'MeetAccept',message:accept});
  return {offerDigest:data.digest,action:accept.action,signature,location:sample(latitude)};
}
it('requires authentication and creates no unsigned preview access', async () => {
  expect((await app.inject({method:'POST',url:'/v1/meet/offers',payload:{momentId:moments[0]}})).statusCode).toBe(401);
});
it('scopes preview, atomically creates Dot/outbox once and authorizes status', async () => {
  const data=await offer(); const payload=await acceptance(data);
  expect((await app.inject({method:'PUT',url:`/v1/meet/offers/${data.id}/location`,headers:headers(),payload:sample()})).statusCode).toBe(200);
  const results=await Promise.all([0,1].map(()=>app.inject({method:'POST',url:`/v1/meet/offers/${data.id}/accept`,headers:headers(1),payload})));
  expect(results.map(r=>r.statusCode).sort()).toEqual([200,201]); expect(results[0]!.json()).toEqual(results[1]!.json());
  expect((await pool.query('SELECT * FROM dots WHERE meet_id=$1',[data.id])).rowCount).toBe(1);
  expect((await pool.query('SELECT * FROM meet_outbox WHERE meet_id=$1',[data.id])).rowCount).toBe(1);
  expect((await pool.query('SELECT poster_location FROM meet_offers WHERE id=$1',[data.id])).rows[0].poster_location).toBeNull();
  expect((await pool.query('SELECT display_lat,display_lng FROM meets WHERE id=$1',[data.id])).rows[0]).toEqual({display_lat:null,display_lng:null});
  expect((await app.inject({url:`/v1/meets/${data.id}`,headers:headers(2)})).statusCode).toBe(404);
  expect((await app.inject({url:`/v1/meets/${data.id}`,headers:headers(1)})).body).not.toMatch(/signature|latitude|nonce|salt/);
  clock=new Date(clock.getTime()+61000); expect((await app.inject({method:'POST',url:`/v1/meet/offers/${data.id}/accept`,headers:headers(1),payload})).statusCode).toBe(200);
});
it('rejects distance, stale location, signature, expiry and reused area', async () => {
  const data=await offer(); const payload=await acceptance(data);
  const url=`/v1/meet/offers/${data.id}`;
  await app.inject({method:'PUT',url:url+'/location',headers:headers(),payload:sample()});
  expect((await app.inject({method:'POST',url:url+'/accept',headers:headers(1),payload:{...payload,location:sample(1)}})).statusCode).toBe(422);
  expect((await app.inject({method:'POST',url:url+'/accept',headers:headers(1),payload:{...payload,location:{...sample(),accuracyMeters:51}}})).statusCode).toBe(422);
  expect((await app.inject({method:'POST',url:url+'/accept',headers:headers(1),payload:{...payload,location:{...sample(),capturedAtMs:clock.getTime()-15001}}})).statusCode).toBe(422);
  expect((await app.inject({method:'POST',url:url+'/accept',headers:headers(1),payload:{...payload,signature:data.signature}})).statusCode).toBe(400);
  expect((await app.inject({method:'POST',url:url+'/accept',headers:headers(1),payload})).statusCode).toBe(409);
  clock=new Date(clock.getTime()+60000); expect((await app.inject({method:'POST',url:url+'/accept',headers:headers(1),payload})).statusCode).toBe(410);
});
it('keeps opt-out Dot without enqueue, rejects changed consent and limits same pair across areas', async () => {
  await pool.query('UPDATE onchain_preferences SET record_meet=false WHERE account_id=$1',[ids[1]]);
  await pool.query('UPDATE moments SET display_lat=55,display_lng=55 WHERE id=$1',[moments[0]]);
  const data=await offer();const payload=await acceptance(data);
  await app.inject({method:'PUT',url:`/v1/meet/offers/${data.id}/location`,headers:headers(),payload:sample(0.01)});
  const accepted=await app.inject({method:'POST',url:`/v1/meet/offers/${data.id}/accept`,headers:headers(1),payload:{...payload,location:sample(0.01)}});
  expect(accepted.statusCode).toBe(201);expect(accepted.json().onchainStatus).toBe('not_saved');expect((await pool.query('SELECT * FROM meet_outbox WHERE meet_id=$1',[data.id])).rowCount).toBe(0);
  const display=(await pool.query('SELECT display_lat,display_lng FROM meets WHERE id=$1',[data.id])).rows[0];expect(Math.abs(display.display_lat-0.01)).toBeLessThan(0.002);expect(Math.abs(display.display_lng)).toBeLessThan(0.002);
  for(let n=2;n<=4;n++) {
    const next=await offer(); const accept=await acceptance(next);
    await app.inject({method:'PUT',url:`/v1/meet/offers/${next.id}/location`,headers:headers(),payload:sample(n*0.01)});
    expect((await app.inject({method:'POST',url:`/v1/meet/offers/${next.id}/accept`,headers:headers(1),payload:{...accept,location:sample(n*0.01)}})).statusCode).toBe(201);
  }
  const limited=await offer();const accept=await acceptance(limited);
  await app.inject({method:'PUT',url:`/v1/meet/offers/${limited.id}/location`,headers:headers(),payload:sample(0.05)});
  const result=await app.inject({method:'POST',url:`/v1/meet/offers/${limited.id}/accept`,headers:headers(1),payload:{...accept,location:sample(0.05)}});expect(result.statusCode).toBe(409);expect(result.body).toContain('MEET_DAILY_LIMIT');
  const changed=await offer(); const original=await acceptance(changed,2);
  await pool.query('UPDATE onchain_preferences SET record_meet=false WHERE account_id=$1',[ids[2]]);
  expect((await app.inject({method:'POST',url:`/v1/meet/offers/${changed.id}/accept`,headers:headers(2),payload:original})).body).toContain('CONSENT_CHANGED');
  const pending=await offer();await pool.query('UPDATE onchain_preferences SET record_meet=false WHERE account_id=$1',[ids[0]]);
  expect((await app.inject({method:'POST',url:`/v1/meet/offers/${pending.id}/preview`,headers:headers(2),payload:{offerDigest:pending.digest,posterSignature:pending.signature}})).body).toContain('CONSENT_CHANGED');
  await pool.query('UPDATE onchain_preferences SET record_meet=true WHERE account_id=ANY($1::uuid[])',[ids]);
  await pool.query('UPDATE moments SET display_lat=NULL,display_lng=NULL WHERE id=$1',[moments[0]]);
});
it('binds signature to domain and requires both check-ins during event window', async () => {
  const data=await offer();const wrongDomain={...data.domain,chainId:1};const message={...data.offer,issuedAt:BigInt(data.offer.issuedAt),expiresAt:BigInt(data.offer.expiresAt)};
  const wrong=await wallets[0]!.signTypedData({domain:wrongDomain,types:meetTypes,primaryType:'MeetOffer',message});
  expect((await app.inject({method:'PUT',url:`/v1/meet/offers/${data.id}/signature`,headers:headers(),payload:{signature:wrong}})).statusCode).toBe(400);
  const event=(await pool.query<{id:string}>("INSERT INTO events(organizer_id,title,starts_at,ends_at) VALUES($1,'Meet fixture',$2,$3) RETURNING id",[ids[0],new Date(clock.getTime()-1000),new Date(clock.getTime()+100000)])).rows[0]!.id;
  try {
    await pool.query('UPDATE moments SET event_id=$2 WHERE id=$1',[moments[0],event]);const tagged=await offer();
    expect((await app.inject({method:'POST',url:`/v1/meet/offers/${tagged.id}/preview`,headers:headers(2),payload:{offerDigest:tagged.digest,posterSignature:tagged.signature}})).statusCode).toBe(403);
    for(const id of [ids[0],ids[2]])await pool.query('INSERT INTO event_checkins VALUES($1,$2,$3,$4)',[event,id,ids[0],clock]);
    const payload=await acceptance(tagged,2);await app.inject({method:'PUT',url:`/v1/meet/offers/${tagged.id}/location`,headers:headers(),payload:sample()});
    await pool.query('DELETE FROM event_checkins WHERE event_id=$1 AND account_id=$2',[event,ids[2]]);
    expect((await app.inject({method:'POST',url:`/v1/meet/offers/${tagged.id}/accept`,headers:headers(2),payload})).statusCode).toBe(403);
  }finally {
    await pool.query('UPDATE moments SET event_id=NULL WHERE id=$1',[moments[0]]);await pool.query('DELETE FROM event_checkins WHERE event_id=$1',[event]);await pool.query('DELETE FROM events WHERE id=$1',[event]);
  }
});
it('proxies preview bytes only within active QR and rejects expiry during private storage read',async()=>{
  const data=await offer();const proof={offerDigest:data.digest,posterSignature:data.signature};
  const preview=await app.inject({method:'POST',url:`/v1/meet/offers/${data.id}/preview`,headers:headers(2),payload:proof});
  expect(preview.statusCode).toBe(200);expect(preview.body).not.toContain('https://');
  const path=preview.json().moment.images[0].path;expect(path).toMatch(/\/media\/(front|back)$/);
  const image=await app.inject({method:'POST',url:path,headers:headers(2),payload:proof});expect(image.statusCode).toBe(200);expect(image.headers['cache-control']).toBe('no-store');
  expect((await app.inject({method:'POST',url:path,headers:headers(2),payload:{...proof,offerDigest:`0x${'ff'.repeat(32)}`}})).statusCode).toBe(400);
  readDelayMs=60000;try{const expired=await app.inject({method:'POST',url:path,headers:headers(2),payload:proof});expect(expired.statusCode).toBe(410);expect(expired.body).not.toContain('synthetic-jpeg');}finally{readDelayMs=0;}
});
it('rejects expiry after pair SQL checks without creating Meet or Dot',async()=>{
  const data=await offer();const payload=await acceptance(data,2);
  await app.inject({method:'PUT',url:`/v1/meet/offers/${data.id}/location`,headers:headers(),payload:sample()});
  timeSequence=[clock,clock,new Date(data.expiresAt)];
  try{expect((await app.inject({method:'POST',url:`/v1/meet/offers/${data.id}/accept`,headers:headers(2),payload})).statusCode).toBe(410);}finally{timeSequence=[];}
  expect((await pool.query('SELECT id FROM meets WHERE id=$1',[data.id])).rowCount).toBe(0);expect((await pool.query('SELECT id FROM dots WHERE meet_id=$1',[data.id])).rowCount).toBe(0);
});
it('preserves participant status access after wallet revocation without granting outsider access',async()=>{
  const meet=(await pool.query<{id:string}>('SELECT id FROM meets WHERE poster_id=$1 ORDER BY accepted_at LIMIT 1',[ids[0]])).rows[0]!;
  await pool.query('UPDATE wallet_bindings SET revoked_at=clock_timestamp() WHERE account_id=$1',[ids[0]]);
  try {
    expect((await app.inject({url:`/v1/meets/${meet.id}`,headers:headers()})).statusCode).toBe(200);
    expect((await app.inject({url:`/v1/meets/${meet.id}`,headers:headers(2)})).statusCode).toBe(404);
    expect((await app.inject({method:'POST',url:'/v1/meet/offers',headers:headers(),payload:{momentId:moments[0]}})).statusCode).toBe(403);
  }finally{await pool.query('UPDATE wallet_bindings SET revoked_at=NULL WHERE account_id=$1',[ids[0]]);}
});
