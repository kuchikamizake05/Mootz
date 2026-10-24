import { afterAll,beforeAll,expect,it } from 'vitest';
import Fastify from 'fastify';
import { Pool } from 'pg';
import { migrate } from '../src/db/migrate.ts';
import { registerDotRoutes } from '../src/dots/routes.ts';
const pool=new Pool({connectionString:process.env.TEST_DATABASE_URL});
const app=Fastify({ajv:{customOptions:{coerceTypes:false,removeAdditional:false}}});
const subjects=Array.from({length:5},()=>`dot-test:${crypto.randomUUID()}`);const ids:string[]=[];const dotIds:string[]=[];const meetIds:string[]=[];const momentIds:string[]=[];
registerDotRoutes(app,{pool,verifyToken:async token=>{if(!subjects.includes(token))throw Error();return{subject:token};}});
const headers=(i=0)=>({authorization:'Bearer '+subjects[i]});
const get=(path:string,i=0)=>app.inject({url:path,headers:headers(i)});
const visibility=(i:number,hidden:boolean,id=dotIds[0])=>app.inject({method:'PUT',url:`/v1/dots/${id}/visibility`,headers:headers(i),payload:{hidden}});
beforeAll(async()=>{
 if(!process.env.TEST_DATABASE_URL)throw Error('TEST_DATABASE_URL required');await migrate(pool);
 for(const subject of subjects)ids.push((await pool.query<{id:string}>('INSERT INTO accounts(provider_subject) VALUES($1) RETURNING id',[subject])).rows[0]!.id);
 for(const [a,b] of [[0,2],[1,3]])await pool.query("INSERT INTO friendships(account_low,account_high,requested_by,status) VALUES(LEAST($1::uuid,$2::uuid),GREATEST($1::uuid,$2::uuid),$1,'accepted')",[ids[a!],ids[b!]]);
 for(let i=0;i<3;i++){
  const moment=(await pool.query<{id:string}>("INSERT INTO moments(author_id,source,published_at,pair_commitment,display_lat,display_lng) VALUES($1,'capture',now(),'private-salt-fixture',$2,$3) RETURNING id",[ids[0],i===1?null:-6,i===1?null:106])).rows[0]!.id;momentIds.push(moment);
  const meet=crypto.randomUUID();meetIds.push(meet);const nonce=crypto.randomUUID();const posterWallet='0x'+ '1'.repeat(40);const scannerWallet='0x'+'2'.repeat(40);
  await pool.query("INSERT INTO meet_offers(id,moment_id,poster_id,poster_wallet,chain_id,verifying_contract,offer,expires_at) VALUES($1,$2,$3,$4,10143,$5,$6,now())",[meet,moment,ids[0],posterWallet,'0x'+'3'.repeat(40),JSON.stringify({nonce,private:'offer-fixture'})]);
  await pool.query("INSERT INTO meets(id,moment_id,poster_id,scanner_id,poster_wallet,scanner_wallet,accepted_at,area_key,server_day,offer,acceptance,poster_signature,scanner_signature,chain_id,verifying_contract,chain_status) VALUES($1,$2,$3,$4,$5,$6,now(),$7,current_date,$8,$9,'secret-signature-a','secret-signature-b',10143,$10,$11)",[meet,moment,ids[0],ids[1],posterWallet,scannerWallet,'private-area-'+nonce,JSON.stringify({nonce}),JSON.stringify({private:'accept'}),'0x'+'3'.repeat(40),['not_saved','recorded','pending'][i]]);
  await pool.query('UPDATE meets SET display_lat=-7,display_lng=107 WHERE id=$1',[meet]);
  dotIds.push((await pool.query<{id:string}>("INSERT INTO dots(meet_id,created_at) VALUES($1,'2026-10-23T00:00:00.000Z') RETURNING id",[meet])).rows[0]!.id);
 }
});
afterAll(async()=>{await app.close();await pool.query('DELETE FROM dots WHERE meet_id=ANY($1::uuid[])',[meetIds]);await pool.query('DELETE FROM meets WHERE id=ANY($1::uuid[])',[meetIds]);await pool.query('DELETE FROM meet_offers WHERE id=ANY($1::uuid[])',[meetIds]);await pool.query('DELETE FROM moments WHERE id=ANY($1::uuid[])',[momentIds]);await pool.query('DELETE FROM friendships WHERE account_low=ANY($1::uuid[]) OR account_high=ANY($1::uuid[])',[ids]);await pool.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[ids]);await pool.end();});
it('requires authentication and denies public Dot creation',async()=>{
 expect((await app.inject({url:'/v1/dots'})).statusCode).toBe(401);expect((await app.inject({url:'/v1/dots',headers:{authorization:'Bearer invalid'}})).statusCode).toBe(401);
 expect((await app.inject({method:'POST',url:'/v1/dots',headers:headers(),payload:{meetId:meetIds[0]}})).statusCode).toBe(404);
});
it('authorizes participants and poster friends but denies scanner-only friends and outsiders',async()=>{
 for(const i of [0,1,2]){const response=await get('/v1/dots/'+dotIds[0],i);expect(response.statusCode).toBe(200);expect(response.json()).toMatchObject({meetId:meetIds[0],participants:[ids[0],ids[1]],onchainStatus:'not_saved',recorded:false,location:{latitude:-7,longitude:107}});expect(response.body).not.toMatch(/secret|private|offer|acceptance|wallet|signature|hidden_by|area_key/);}
 for(const i of [3,4]){expect((await get('/v1/dots/'+dotIds[0],i)).statusCode).toBe(404);expect((await get('/v1/dots',i)).json().items).toEqual([]);}
 expect((await get('/v1/dots?momentId='+momentIds[1])).json().items).toEqual([expect.objectContaining({id:dotIds[1],location:null,recorded:true})]);
});
it('places Dots at Meet area rather than photo location and suppresses unshared coordinates',async()=>{
 expect((await get('/v1/dots/'+dotIds[0])).json().location).toEqual({latitude:-7,longitude:107});
 expect((await get('/v1/dots/'+dotIds[1])).json().location).toBeNull();
 const listed=(await get('/v1/dots?map=true')).json().items;expect(listed.map((r:{id:string})=>r.id)).not.toContain(dotIds[1]);
 expect(listed).toEqual(expect.arrayContaining([expect.objectContaining({id:dotIds[0],location:{latitude:-7,longitude:107}})]));
 await pool.query('UPDATE meets SET display_lat=NULL,display_lng=NULL WHERE id=$1',[meetIds[2]]);
 expect((await get('/v1/dots/'+dotIds[2])).json().location).toBeNull();
 expect((await get('/v1/dots?map=true')).json().items.map((r:{id:string})=>r.id)).not.toContain(dotIds[2]);
});
it('bounds and scopes keyset pagination including ties and malformed timestamps',async()=>{
 const first=(await get('/v1/dots?limit=1')).json();const second=(await get('/v1/dots?limit=1&cursor='+first.nextCursor)).json();const third=(await get('/v1/dots?limit=1&cursor='+second.nextCursor)).json();
 expect(new Set([first.items[0].id,second.items[0].id,third.items[0].id]).size).toBe(3);expect(third.nextCursor).toBeNull();
 for(const query of ['limit=0','limit=51','map=yes','cursor=bad','map=true&cursor='+first.nextCursor,'momentId='+momentIds[0]+'&cursor='+first.nextCursor])expect((await get('/v1/dots?'+query)).statusCode).toBe(400);
 expect((await get('/v1/dots?cursor='+first.nextCursor,1)).statusCode).toBe(400);
 const bad=JSON.parse(Buffer.from(first.nextCursor,'base64url').toString());bad.time='2026-02-30T00:00:00.000Z';expect((await get('/v1/dots?cursor='+Buffer.from(JSON.stringify(bad)).toString('base64url'))).statusCode).toBe(400);
});
it('hides map markers for all viewers while retaining participant lists and summary',async()=>{
 expect((await visibility(2,true)).statusCode).toBe(404);expect((await visibility(0,true)).statusCode).toBe(200);expect((await visibility(0,true)).statusCode).toBe(200);
 for(const i of [0,1,2]){const map=(await get('/v1/dots?map=true',i)).json();expect(map.items.map((r:{id:string})=>r.id)).not.toContain(dotIds[0]);expect(map.items.map((r:{id:string})=>r.id)).not.toContain(dotIds[1]);}
 for(const i of [0,1]){expect((await get('/v1/dots/'+dotIds[0],i)).json().hidden).toBe(true);expect((await get('/v1/me/dots/summary',i)).json()).toEqual({dotCount:3,uniquePartners:1});}
 expect((await get('/v1/me/dots/summary',2)).json()).toEqual({dotCount:0,uniquePartners:0});
 expect((await visibility(1,false)).statusCode).toBe(409);expect((await visibility(1,true)).statusCode).toBe(409);expect((await visibility(0,false)).statusCode).toBe(200);expect((await visibility(1,false)).statusCode).toBe(200);
});
it('serializes competing participant hides without transferring restoration rights',async()=>{
 const replies=await Promise.all([visibility(0,true),visibility(1,true)]);expect(replies.map(r=>r.statusCode).sort()).toEqual([200,409]);const winner=replies[0]!.statusCode===200?0:1;expect((await visibility(1-winner,false)).statusCode).toBe(409);expect((await visibility(winner,false)).statusCode).toBe(200);
});
it('revokes poster friend access immediately after accepted friendship removal',async()=>{
 await pool.query('DELETE FROM friendships WHERE account_low=LEAST($1::uuid,$2::uuid) AND account_high=GREATEST($1::uuid,$2::uuid)',[ids[0],ids[2]]);expect((await get('/v1/dots/'+dotIds[0],2)).statusCode).toBe(404);expect((await get('/v1/dots',2)).json().items).toEqual([]);
 expect((await get('/v1/dots/'+dotIds[0],1)).statusCode).toBe(200);
});
it('reports exact-transaction finality without granting access or removing Dots',async()=>{
 const hash='0x'+'a'.repeat(64),block='0x'+'b'.repeat(64),meet=meetIds[0];
 await pool.query('UPDATE meets SET transaction_hash=$2 WHERE id=$1',[meet,hash]);
 try{
  await pool.query("INSERT INTO chain_receipt_observations(source,job_id,chain_id,contract_address,transaction_hash,observed_status,receipt_block_number,receipt_block_hash,canonical_block_hash,finalized_at,finalized_block_number,finalized_block_hash) SELECT 'meet',id,chain_id,lower(verifying_contract),$2,'success',20,$3,$3,now(),21,$3 FROM meets WHERE id=$1",[meet,hash,block]);
  expect((await get('/v1/dots/'+dotIds[0])).json()).toMatchObject({recorded:true,finality:'finalized',chainOutcome:'success'});
  expect((await get('/v1/dots/'+dotIds[0],4)).statusCode).toBe(404);
  await pool.query("UPDATE chain_receipt_observations SET observed_status='pending',receipt_block_number=NULL,receipt_block_hash=NULL,canonical_block_hash=NULL,finalized_at=NULL,finalized_block_number=NULL,finalized_block_hash=NULL WHERE source='meet' AND job_id=$1",[meet]);
  expect((await get('/v1/dots/'+dotIds[0])).json()).toMatchObject({recorded:false,onchainStatus:'pending',finality:'unverified'});
  await pool.query("UPDATE chain_receipt_observations SET observed_status='success',receipt_block_number=20,receipt_block_hash=$2,canonical_block_hash=$2,finalized_at=now(),finalized_block_number=21,finalized_block_hash=$2 WHERE source='meet' AND job_id=$1",[meet,block]);
  await pool.query('UPDATE meets SET transaction_hash=$2 WHERE id=$1',[meet,'0x'+'c'.repeat(64)]);
  expect((await get('/v1/dots/'+dotIds[0])).json()).toMatchObject({finality:'unverified',chainOutcome:'unverified'});
  expect((await pool.query('SELECT 1 FROM dots WHERE meet_id=$1',[meet])).rowCount).toBe(1);
 }finally{
  await pool.query("DELETE FROM chain_receipt_observations WHERE source='meet' AND job_id=$1",[meet]);
  await pool.query('UPDATE meets SET transaction_hash=NULL WHERE id=$1',[meet]);
 }
});
