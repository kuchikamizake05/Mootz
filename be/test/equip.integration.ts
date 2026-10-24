import { afterAll,beforeAll,expect,it } from 'vitest';
import Fastify from 'fastify';
import { createApp } from '../src/app.ts';
import { Pool } from 'pg';
import { registerEquipRoutes } from '../src/collections/equip.ts';
import { migrate } from '../src/db/migrate.ts';
import { uuidBytes32 } from '../src/protocol/index.ts';
import type { CollectionGateway } from '../src/collections/types.ts';
const pool=new Pool({connectionString:process.env.TEST_DATABASE_URL});const app=Fastify({ajv:{customOptions:{removeAdditional:false,coerceTypes:false}}});
const subject='equip-test:'+crypto.randomUUID();let account:string,event:string,ref:string;let balance=1n,broken=false,wrongEvent=false;const address='0x1111111111111111111111111111111111111111';
const gateway:CollectionGateway={domain:{chainId:10143,verifyingContract:address},issuerAddress:null,read:async()=>{if(broken)throw Error('RPC private secret');return{eventId:uuidBytes32(wrongEvent?crypto.randomUUID():event),balance,cap:5n,totalSupply:1n,claimed:true,issuerAuthorized:false,metadataURI:''};}};
registerEquipRoutes(app,{pool,gateway,verifyToken:async token=>{if(token!==subject)throw Error();return{subject};}});
const headers={authorization:'Bearer '+subject};const get=()=>app.inject({url:'/v1/me/equipped-collection',headers});const put=()=>app.inject({method:'PUT',url:'/v1/me/equipped-collection',headers,payload:{collectionRef:ref}});
beforeAll(async()=>{if(!process.env.TEST_DATABASE_URL)throw Error('TEST_DATABASE_URL required');await migrate(pool);account=(await pool.query<{id:string}>('INSERT INTO accounts(provider_subject) VALUES($1) RETURNING id',[subject])).rows[0]!.id;event=(await pool.query<{id:string}>("INSERT INTO events(organizer_id,title,starts_at,ends_at) VALUES($1,'Equip test',now(),now()+interval '1 hour') RETURNING id",[account])).rows[0]!.id;ref=(await pool.query<{id:string}>("INSERT INTO event_collections(event_id,chain_id,contract_address,collection_id,claim_starts_at,claim_ends_at,display_name,artwork_url) VALUES($1,10143,$2,987654321,now(),now()+interval '1 hour','Equip test','https://example.com/fixture.png') RETURNING id",[event,address])).rows[0]!.id;await pool.query('INSERT INTO wallet_bindings(account_id,chain_id,address,verified_at) VALUES($1,10143,$2,now())',[account,'0x2222222222222222222222222222222222222222']);});
afterAll(async()=>{await app.close();await pool.query('DELETE FROM collection_equips WHERE account_id=$1',[account]);await pool.query('DELETE FROM event_collections WHERE id=$1',[ref]);await pool.query('DELETE FROM events WHERE id=$1',[event]);await pool.query('DELETE FROM wallet_bindings WHERE account_id=$1',[account]);await pool.query('DELETE FROM accounts WHERE id=$1',[account]);await pool.end();});
it('requires auth and rejects recipient forgery',async()=>{expect((await app.inject({url:'/v1/me/equipped-collection'})).statusCode).toBe(401);expect((await app.inject({method:'PUT',url:'/v1/me/equipped-collection',headers,payload:{collectionRef:ref,recipient:address}})).statusCode).toBe(400);});
it('uses actual chain balance, irrespective of issuer authorization and check-in',async()=>{expect((await get()).json()).toEqual({equipped:null});balance=0n;expect((await put()).statusCode).toBe(403);balance=1n;const responses=await Promise.all([put(),put(),put()]);expect(responses.every(r=>r.statusCode===200)).toBe(true);expect(new Set(responses.map(r=>r.json().equipped.equippedAt)).size).toBe(1);expect((await get()).json().equipped.collectionRef).toBe(ref);});
it('retains prior equip on RPC failure and rejects incorrect mapping',async()=>{broken=true;expect((await get()).statusCode).toBe(503);expect((await pool.query('SELECT 1 FROM collection_equips WHERE account_id=$1',[account])).rowCount).toBe(1);broken=false;wrongEvent=true;expect((await put()).statusCode).toBe(503);wrongEvent=false;await pool.query('UPDATE event_collections SET contract_address=$1 WHERE id=$2',['0x3333333333333333333333333333333333333333',ref]);expect((await get()).statusCode).toBe(503);await pool.query('UPDATE event_collections SET contract_address=$1 WHERE id=$2',[address,ref]);});
it('clears on confirmed loss of ownership and revoked wallet',async()=>{balance=0n;expect((await get()).json()).toEqual({equipped:null});balance=1n;await put();await pool.query('UPDATE wallet_bindings SET revoked_at=clock_timestamp() WHERE account_id=$1',[account]);expect((await get()).json()).toEqual({equipped:null});expect((await put()).statusCode).toBe(403);});
it('allows repeated deletion without RPC',async()=>{broken=true;for(let n=0;n<2;n++)expect((await app.inject({method:'DELETE',url:'/v1/me/equipped-collection',headers})).statusCode).toBe(204);});
it('rechecks the replacement wallet rather than trusting former ownership',async()=>{broken=false;balance=1n;await pool.query('UPDATE wallet_bindings SET revoked_at=NULL WHERE account_id=$1',[account]);await put();await pool.query('UPDATE wallet_bindings SET revoked_at=clock_timestamp() WHERE account_id=$1',[account]);const replacement='0x4444444444444444444444444444444444444444';await pool.query('INSERT INTO wallet_bindings(account_id,chain_id,address,verified_at) VALUES($1,10143,$2,now())',[account,replacement]);const original=gateway.read;gateway.read=async(id,wallet)=>{expect(wallet).toBe(replacement);return{...await original(id,wallet),balance:0n};};expect((await get()).json()).toEqual({equipped:null});gateway.read=original;});



it('createApp keeps authenticated unequip available without any gateway configuration',async()=>{
 await pool.query('INSERT INTO collection_equips(account_id,collection_ref) VALUES($1,$2)',[account,ref]);
 const offline=createApp({origins:['http://localhost:3000'],database:{probe:async()=>{},close:async()=>{}},logger:false,equips:{pool,verifyToken:async token=>{if(token!==subject)throw Error();return{subject};}}});
 try{
  expect((await offline.inject({method:'DELETE',url:'/v1/me/equipped-collection'})).statusCode).toBe(401);
  const unavailable=await offline.inject({url:'/v1/me/equipped-collection',headers});expect(unavailable.statusCode).toBe(503);expect(unavailable.json()).toMatchObject({error:{code:'CHAIN_UNAVAILABLE'}});
  expect((await pool.query('SELECT 1 FROM collection_equips WHERE account_id=$1',[account])).rowCount).toBe(1);
  expect((await offline.inject({method:'DELETE',url:'/v1/me/equipped-collection',headers})).statusCode).toBe(204);
  expect((await pool.query('SELECT 1 FROM collection_equips WHERE account_id=$1',[account])).rowCount).toBe(0);
 }finally{await offline.close();}
});
