import {afterAll,beforeAll,expect,it} from 'vitest';
import Fastify from 'fastify';
import {Pool} from 'pg';
import {migrate} from '../src/db/migrate.ts';
import {registerFrameRoutes} from '../src/frames/routes.ts';
import {syncAchievements} from '../src/frames/service.ts';
import {readFrame} from '../src/frames/service.ts';
import {uuidBytes32} from '../src/protocol/index.ts';
import type {CollectionGateway} from '../src/collections/types.ts';
import {registerEquipRoutes} from '../src/collections/equip.ts';
const pool=new Pool({connectionString:process.env.TEST_DATABASE_URL});
const app=Fastify({ajv:{customOptions:{removeAdditional:false,coerceTypes:false}}});
const subjects=Array.from({length:7},()=>`frames:${crypto.randomUUID()}`),ids:string[]=[];let moment:string;
registerFrameRoutes(app,{pool,verifyToken:async token=>{if(!subjects.includes(token))throw Error();return{subject:token};}});
const headers={authorization:'Bearer '+subjects[0]};
const inventory=()=>app.inject({url:'/v1/me/frames',headers});
async function dot(partner:number){const id=crypto.randomUUID();await pool.query("INSERT INTO meet_offers(id,moment_id,poster_id,poster_wallet,chain_id,verifying_contract,offer,expires_at) VALUES($1,$2,$3,$4,10143,$5,'{}',now())",[id,moment,ids[0],'0x'+'11'.repeat(20),'0x'+'33'.repeat(20)]);await pool.query("INSERT INTO meets(id,moment_id,poster_id,scanner_id,poster_wallet,scanner_wallet,accepted_at,area_key,server_day,offer,acceptance,poster_signature,scanner_signature,chain_id,verifying_contract,chain_status) VALUES($1,$2,$3,$4,$5,$6,now(),$1::uuid::text,current_date,'{}','{}','fixture','fixture',10143,$7,'not_saved')",[id,moment,ids[0],ids[partner],'0x'+'11'.repeat(20),'0x'+'22'.repeat(20),'0x'+'33'.repeat(20)]);await pool.query('INSERT INTO dots(meet_id,hidden_by) VALUES($1,$2)',[id,ids[0]]);}
beforeAll(async()=>{if(!process.env.TEST_DATABASE_URL)throw Error('TEST_DATABASE_URL required');await migrate(pool);for(const subject of subjects)ids.push((await pool.query<{id:string}>('INSERT INTO accounts(provider_subject) VALUES($1) RETURNING id',[subject])).rows[0]!.id);moment=(await pool.query<{id:string}>("INSERT INTO moments(author_id,source) VALUES($1,'capture') RETURNING id",[ids[0]])).rows[0]!.id;});
afterAll(async()=>{await app.close();for(const table of ['profile_frames','achievement_unlocks'])await pool.query(`DELETE FROM ${table} WHERE account_id=ANY($1::uuid[])`,[ids]);await pool.query('DELETE FROM friendships WHERE account_low=ANY($1::uuid[]) OR account_high=ANY($1::uuid[])',[ids]);await pool.query('DELETE FROM dots WHERE meet_id IN(SELECT id FROM meets WHERE moment_id=$1)',[moment]);await pool.query('DELETE FROM meets WHERE moment_id=$1',[moment]);await pool.query('DELETE FROM meet_offers WHERE moment_id=$1',[moment]);await pool.query('DELETE FROM moments WHERE id=$1',[moment]);await pool.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[ids]);await pool.end();});
it('requires auth, rejects forged fields and locked equip',async()=>{expect((await app.inject({url:'/v1/me/frames'})).statusCode).toBe(401);expect((await inventory()).json().metrics).toEqual({dotCount:0,distinctFriendPartners:0});expect((await app.inject({method:'PUT',url:'/v1/me/frame',headers,payload:{frameId:'first_meet'}})).statusCode).toBe(403);expect((await app.inject({method:'PUT',url:'/v1/me/frame',headers,payload:{frameId:'first_meet',accountId:ids[1]}})).statusCode).toBe(400);});
it('counts hidden offchain Dots, persists unlocks and equips idempotently',async()=>{await dot(1);let data=(await inventory()).json();expect(data.policy).toEqual({version:'demo-v1',status:'demo'});expect(data.items.find((x:{id:string})=>x.id==='first_meet').unlocked).toBe(true);expect(data.items.find((x:{id:string})=>x.id==='together').unlocked).toBe(false);const responses=await Promise.all([0,1,2].map(()=>app.inject({method:'PUT',url:'/v1/me/frame',headers,payload:{frameId:'first_meet'}})));expect(responses.every(r=>r.statusCode===200)).toBe(true);expect(new Set(responses.map(r=>r.json().frame.equippedAt)).size).toBe(1);expect((await app.inject({url:'/v1/me/frame',headers})).json().frame).toMatchObject({kind:'achievement',id:'first_meet'});for(let n=0;n<8;n++)await dot(1);data=(await inventory()).json();expect(data.metrics.dotCount).toBe(9);expect(data.items.find((x:{id:string})=>x.id==='together').unlocked).toBe(false);await dot(1);expect((await inventory()).json().items.find((x:{id:string})=>x.id==='together').unlocked).toBe(true);});
it('requires five distinct currently accepted friends and preserves achieved unlock after unfriend',async()=>{for(let n=2;n<=6;n++)await dot(n);expect((await inventory()).json().metrics.distinctFriendPartners).toBe(0);for(let n=1;n<=5;n++)await pool.query("INSERT INTO friendships(account_low,account_high,requested_by,status) VALUES(LEAST($1::uuid,$2::uuid),GREATEST($1::uuid,$2::uuid),$1,'accepted')",[ids[0],ids[n]]);const data=(await inventory()).json();expect(data.metrics.distinctFriendPartners).toBe(5);const unlocked=data.items.find((x:{id:string})=>x.id==='social_butterfly');expect(unlocked.unlocked).toBe(true);await pool.query('DELETE FROM friendships WHERE requested_by=$1',[ids[0]]);const after=(await inventory()).json();expect(after.metrics.distinctFriendPartners).toBe(0);expect(after.items.find((x:{id:string})=>x.id==='social_butterfly').unlockedAt).toBe(unlocked.unlockedAt);});
it('serializes concurrent reconciliation and removes frame without chain access',async()=>{await Promise.all([0,1,2].map(async()=>{const c=await pool.connect();try{await c.query('BEGIN');await syncAchievements(c,[ids[1]!,ids[0]!]);await c.query('COMMIT');}finally{c.release();}}));expect((await pool.query('SELECT 1 FROM achievement_unlocks WHERE account_id=$1',[ids[0]])).rowCount).toBe(3);for(let n=0;n<2;n++)expect((await app.inject({method:'DELETE',url:'/v1/me/frame',headers})).statusCode).toBe(204);expect((await app.inject({url:'/v1/me/frame',headers})).json()).toEqual({frame:null});});
it('shares one frame slot with Event collections and reports chain uncertainty honestly',async()=>{
 const event=(await pool.query<{id:string}>("INSERT INTO events(organizer_id,title,starts_at,ends_at) VALUES($1,'Frame fixture',now(),now()+interval '1 hour') RETURNING id",[ids[0]])).rows[0]!.id;
 const address='0x'+'66'.repeat(20),wallet='0x'+'77'.repeat(20);
 const ref=(await pool.query<{id:string}>("INSERT INTO event_collections(event_id,chain_id,contract_address,collection_id,claim_starts_at,claim_ends_at,display_name,artwork_url) VALUES($1,10143,$2,123456789,now(),now()+interval '1 hour','Frame fixture','https://example.com/frame.png') RETURNING id",[event,address])).rows[0]!.id;
 const gateway:CollectionGateway={domain:{chainId:10143,verifyingContract:address as `0x${string}`},issuerAddress:null,read:async()=>({eventId:uuidBytes32(event),cap:10n,totalSupply:1n,balance:1n,claimed:true,issuerAuthorized:false,metadataURI:''})};
 try{
  await pool.query('INSERT INTO wallet_bindings(account_id,chain_id,address,verified_at) VALUES($1,10143,$2,now())',[ids[0],wallet]);
  await pool.query('INSERT INTO collection_equips(account_id,collection_ref) VALUES($1,$2)',[ids[0],ref]);
  expect((await readFrame(pool,ids[0]!,gateway)).frame).toMatchObject({kind:'collection',collectionRef:ref});
  const owned=gateway.read;
  gateway.read=async()=>({...await owned(123456789n,wallet as `0x${string}`),eventId:uuidBytes32(crypto.randomUUID())});
  expect((await readFrame(pool,ids[0]!,gateway)).status).toBe('unavailable');
  gateway.read=async()=>({...await owned(123456789n,wallet as `0x${string}`),balance:0n});
  expect(await readFrame(pool,ids[0]!,gateway)).toEqual({status:'none',frame:null});
  expect((await pool.query('SELECT 1 FROM profile_frames WHERE account_id=$1',[ids[0]])).rowCount).toBe(1);
  gateway.read=owned;
  expect((await readFrame(pool,ids[0]!)).status).toBe('unavailable');
  expect((await app.inject({url:'/v1/me/frame',headers})).statusCode).toBe(503);
  expect((await pool.query('SELECT 1 FROM profile_frames WHERE account_id=$1',[ids[0]])).rowCount).toBe(1);
  gateway.read=async()=>{throw Error('private RPC detail');};expect((await readFrame(pool,ids[0]!,gateway)).status).toBe('unavailable');
  await app.inject({method:'PUT',url:'/v1/me/frame',headers,payload:{frameId:'first_meet'}});
  expect((await pool.query('SELECT 1 FROM collection_equips WHERE account_id=$1',[ids[0]])).rowCount).toBe(0);
  expect((await readFrame(pool,ids[0]!)).frame).toMatchObject({kind:'achievement'});
  const legacy=Fastify();
  gateway.read=async()=>({eventId:uuidBytes32(event),balance:1n,cap:2n,totalSupply:1n,claimed:true,issuerAuthorized:false,metadataURI:'synthetic'});
  registerEquipRoutes(legacy,{pool,gateway,verifyToken:async()=>({subject:subjects[0]!})});
  try {
   const changed=await legacy.inject({method:'PUT',url:'/v1/me/equipped-collection',headers,payload:{collectionRef:ref}});
   expect(changed.statusCode).toBe(200);
   expect((await readFrame(pool,ids[0]!,gateway)).frame).toMatchObject({kind:'collection',collectionRef:ref});
   const concurrent=await Promise.all([
    legacy.inject({method:'PUT',url:'/v1/me/equipped-collection',headers,payload:{collectionRef:ref}}),
    app.inject({method:'PUT',url:'/v1/me/frame',headers,payload:{frameId:'first_meet'}}),
   ]);
   expect(concurrent.map(response=>response.statusCode)).toEqual([200,200]);
   expect((await pool.query('SELECT 1 FROM profile_frames WHERE account_id=$1',[ids[0]])).rowCount).toBe(1);
   await app.inject({method:'PUT',url:'/v1/me/frame',headers,payload:{frameId:'first_meet'}});
   expect((await legacy.inject({method:'DELETE',url:'/v1/me/equipped-collection',headers})).statusCode).toBe(204);
   expect((await readFrame(pool,ids[0]!)).frame).toMatchObject({kind:'achievement'});
  } finally { await legacy.close(); }
  await app.inject({method:'DELETE',url:'/v1/me/frame',headers});
  await pool.query('INSERT INTO collection_equips(account_id,collection_ref) VALUES($1,$2)',[ids[0],ref]);
  expect((await app.inject({method:'DELETE',url:'/v1/me/frame',headers})).statusCode).toBe(204);
  expect((await pool.query('SELECT 1 FROM profile_frames WHERE account_id=$1',[ids[0]])).rowCount).toBe(0);
 }finally{await pool.query('DELETE FROM profile_frames WHERE account_id=$1',[ids[0]]);await pool.query('DELETE FROM wallet_bindings WHERE account_id=$1',[ids[0]]);await pool.query('DELETE FROM event_collections WHERE id=$1',[ref]);await pool.query('DELETE FROM events WHERE id=$1',[event]);}
});
