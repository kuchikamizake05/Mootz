import {afterAll,beforeAll,expect,it} from 'vitest';
import Fastify from 'fastify';
import {Pool} from 'pg';
import {privateKeyToAccount} from 'viem/accounts';
import {collectionDomain,claimTypes,uuidBytes32,type Claim} from '../src/protocol/index.ts';
import {registerClaimSubmissionRoutes} from '../src/claim-relay/routes.ts';
import {migrate} from '../src/db/migrate.ts';
import type {CollectionGateway} from '../src/collections/types.ts';
import { encodeAbiParameters, encodeEventTopics, encodeFunctionData, keccak256, parseAbi } from 'viem';
import { runFinalityReconciler } from '../src/chain-sync/index.ts';
import type { ChainReadAdapter, ChainReceipt } from '../src/chain-sync/types.ts';
const pool=new Pool({connectionString:process.env.TEST_DATABASE_URL});const app=Fastify({ajv:{customOptions:{removeAdditional:false,coerceTypes:false}}});
const subject='submission:'+crypto.randomUUID(),other='submission-other:'+crypto.randomUUID();const issuer=privateKeyToAccount('0x'+'45'.repeat(32) as `0x${string}`);const recipient='0x2222222222222222222222222222222222222222';const contract='0x1111111111111111111111111111111111111111';let actor:string,otherActor:string,event:string,ref:string,authorization:string,job:string;let broken=false,balance=0n,supply=0n,wrongEvent=false;let clock=new Date();
const gateway:CollectionGateway={domain:{chainId:10143,verifyingContract:contract},issuerAddress:null,read:async()=>{if(broken)throw Error('private RPC');return{eventId:uuidBytes32(wrongEvent?crypto.randomUUID():event),cap:10n,totalSupply:supply,balance,claimed:balance>0n,issuerAuthorized:false,metadataURI:''};}};
registerClaimSubmissionRoutes(app,{pool,gateway,verifyToken:async token=>{if(token!==subject&&token!==other)throw Error();return{subject:token};},now:()=>clock});
const headers={authorization:'Bearer '+subject};const submit=(id=authorization)=>app.inject({method:'POST',url:`/v1/events/${event}/claims`,headers,payload:{authorizationId:id}});
async function voucher(){const claim:Claim={collectionId:7654321n,recipient,issuer:issuer.address,nonce:('0x'+crypto.randomUUID().replaceAll('-','').repeat(2)) as `0x${string}`,deadline:BigInt(Math.floor(clock.getTime()/1000)+120)};const signature=await issuer.signTypedData({domain:collectionDomain(10143,contract),types:claimTypes,primaryType:'Claim',message:claim});const id=crypto.randomUUID();await pool.query('INSERT INTO claim_authorizations(id,account_id,collection_ref,recipient,issuer,nonce,deadline,claim,signature,client_request_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[id,actor,ref,recipient,issuer.address.toLowerCase(),claim.nonce,new Date(Number(claim.deadline)*1000),{...claim,collectionId:String(claim.collectionId),deadline:String(claim.deadline)},signature,crypto.randomUUID()]);return id;}
beforeAll(async()=>{await migrate(pool);actor=(await pool.query('INSERT INTO accounts(provider_subject) VALUES($1) RETURNING id',[subject])).rows[0].id;otherActor=(await pool.query('INSERT INTO accounts(provider_subject) VALUES($1) RETURNING id',[other])).rows[0].id;event=(await pool.query("INSERT INTO events(organizer_id,title,starts_at,ends_at) VALUES($1,'Submission',now()-interval '1 hour',now()+interval '1 day') RETURNING id",[actor])).rows[0].id;ref=(await pool.query("INSERT INTO event_collections(event_id,chain_id,contract_address,collection_id,claim_starts_at,claim_ends_at,display_name,artwork_url) VALUES($1,10143,$2,7654321,now()-interval '1 hour',now()+interval '1 day','Fixture','https://example.com/a.png') RETURNING id",[event,contract])).rows[0].id;await pool.query('INSERT INTO wallet_bindings(account_id,chain_id,address,verified_at) VALUES($1,10143,$2,now())',[actor,recipient]);await pool.query('INSERT INTO event_checkins(event_id,account_id,checked_in_by,checked_in_at) VALUES($1,$2,$2,now())',[event,actor]);authorization=await voucher();});
afterAll(async()=>{await app.close();await pool.query('DELETE FROM claim_outbox WHERE account_id=$1',[actor]);await pool.query('DELETE FROM claim_authorizations WHERE account_id=$1',[actor]);await pool.query('DELETE FROM event_checkins WHERE event_id=$1',[event]);await pool.query('DELETE FROM wallet_bindings WHERE account_id=$1',[actor]);await pool.query('DELETE FROM event_collections WHERE id=$1',[ref]);await pool.query('DELETE FROM events WHERE id=$1',[event]);await pool.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[[actor,otherActor]]);await pool.end();});
it('requires identity and rejects caller-selected recipient',async()=>{expect((await app.inject({method:'POST',url:`/v1/events/${event}/claims`,payload:{authorizationId:authorization}})).statusCode).toBe(401);expect((await app.inject({method:'POST',url:`/v1/events/${event}/claims`,headers,payload:{authorizationId:authorization,recipient}})).statusCode).toBe(400);expect((await app.inject({method:'POST',url:`/v1/events/${event}/claims`,headers:{authorization:'Bearer '+other},payload:{authorizationId:authorization}})).statusCode).toBe(404);});
it('fails closed for RPC, wrong mapping, ownership and cap without enqueue',async()=>{broken=true;expect((await submit()).statusCode).toBe(503);broken=false;wrongEvent=true;expect((await submit()).statusCode).toBe(503);wrongEvent=false;balance=1n;expect((await submit()).statusCode).toBe(409);balance=0n;supply=10n;expect((await submit()).statusCode).toBe(409);supply=0n;expect((await pool.query('SELECT 1 FROM claim_outbox WHERE authorization_id=$1',[authorization])).rowCount).toBe(0);});
it('queues a signed voucher with read-only gateway and concurrent retries share one job',async()=>{const result=await Promise.all([submit(),submit(),submit()]);expect(result.map(r=>r.statusCode)).toEqual([202,202,202]);job=result[0]!.json().claimId;expect(result.every(r=>r.json().claimId===job)).toBe(true);expect((await pool.query('SELECT 1 FROM claim_outbox WHERE authorization_id=$1',[authorization])).rowCount).toBe(1);expect(JSON.stringify(result[0]!.json())).not.toContain('signature');});
it('scopes status to actor and works during RPC failure',async()=>{broken=true;const response=await app.inject({url:`/v1/events/${event}/claims/${job}`,headers});expect(response.statusCode).toBe(200);expect(response.json()).toMatchObject({claimId:job,status:'pending',finality:'unverified'});expect((await app.inject({url:`/v1/events/${event}/claims/${job}`,headers:{authorization:'Bearer '+other}})).statusCode).toBe(404);expect((await submit()).statusCode).toBe(202);broken=false;});
it('prevents another voucher creating a second active claim and permits expired idempotent retry',async()=>{const another=await voucher();expect((await submit(another)).statusCode).toBe(409);clock=new Date(clock.getTime()+180000);expect((await submit()).statusCode).toBe(202);expect((await submit(another)).statusCode).toBe(410);});
it('returns completed status without treating it as ownership',async()=>{await pool.query("UPDATE claim_outbox SET status='included',completed_at=clock_timestamp() WHERE id=$1",[job]);const response=await submit();expect(response.statusCode).toBe(200);expect(response.json()).toMatchObject({status:'included',finality:'unverified'});expect(response.json()).not.toHaveProperty('owned');});
it('rejects altered signatures, stale wallet bindings, missing check-in and closed windows',async()=>{
 const id=await voucher();const row=(await pool.query('SELECT signature FROM claim_authorizations WHERE id=$1',[id])).rows[0];await pool.query('UPDATE claim_authorizations SET signature=$1 WHERE id=$2',['0x'+'11'.repeat(65),id]);expect((await submit(id)).statusCode).toBe(409);await pool.query('UPDATE claim_authorizations SET signature=$1 WHERE id=$2',[row.signature,id]);
 await pool.query('UPDATE wallet_bindings SET address=$1 WHERE account_id=$2',['0x3333333333333333333333333333333333333333',actor]);expect((await submit(id)).statusCode).toBe(409);await pool.query('UPDATE wallet_bindings SET address=$1 WHERE account_id=$2',[recipient,actor]);
 await pool.query('DELETE FROM event_checkins WHERE event_id=$1 AND account_id=$2',[event,actor]);expect((await submit(id)).statusCode).toBe(403);await pool.query('INSERT INTO event_checkins(event_id,account_id,checked_in_by,checked_in_at) VALUES($1,$2,$2,now())',[event,actor]);
 const original=clock;clock=new Date(clock.getTime()-7200000);expect((await submit(id)).statusCode).toBe(409);clock=new Date(original.getTime()+172800000);expect((await submit(id)).statusCode).toBe(410);clock=original;
 expect((await pool.query('SELECT 1 FROM claim_outbox WHERE authorization_id=$1',[id])).rowCount).toBe(0);
});
it('rechecks expiry after asynchronous chain work and never persists an expired voucher',async()=>{const id=await voucher();const original=gateway.read;gateway.read=async(...args)=>{const state=await original(...args);clock=new Date(clock.getTime()+121000);return state;};try{expect((await submit(id)).statusCode).toBe(410);expect((await pool.query('SELECT 1 FROM claim_outbox WHERE authorization_id=$1',[id])).rowCount).toBe(0);}finally{gateway.read=original;}});
it('status lookup remains private and available when registered without a chain gateway',async()=>{const offline=Fastify();registerClaimSubmissionRoutes(offline,{pool,verifyToken:async()=>({subject})});try{const response=await offline.inject({url:`/v1/events/${event}/claims/${job}`,headers});expect(response.statusCode).toBe(200);expect(response.json().claimId).toBe(job);expect(JSON.stringify(response.json())).not.toContain('signature');}finally{await offline.close();}});
it('shows only safe worker reasons and suppresses private provider diagnostics',async()=>{await pool.query('UPDATE claim_outbox SET last_error=$1 WHERE id=$2',['ISSUER_UNAVAILABLE',job]);let response=await app.inject({url:`/v1/events/${event}/claims/${job}`,headers});expect(response.json().reason).toBe('ISSUER_UNAVAILABLE');await pool.query('UPDATE claim_outbox SET last_error=$1 WHERE id=$2',['RPC secret-token internal-host',job]);response=await app.inject({url:`/v1/events/${event}/claims/${job}`,headers});expect(response.json()).not.toHaveProperty('reason');expect(response.body).not.toContain('secret-token');await pool.query('UPDATE claim_outbox SET last_error=NULL WHERE id=$1',[job]);});
it('reports canonical claim finality privately and rejects stale transaction evidence',async()=>{
 const hash='0x'+'a'.repeat(64),block='0x'+'b'.repeat(64),url=`/v1/events/${event}/claims/${job}`;
 await pool.query("UPDATE claim_outbox SET transaction_hash=$2,raw_transaction='0x0102',relayer_address=$3 WHERE id=$1",[job,hash,recipient]);
 try{
  await pool.query("INSERT INTO chain_receipt_observations(source,job_id,chain_id,contract_address,transaction_hash,observed_status,receipt_block_number,receipt_block_hash,canonical_block_hash,finalized_at,finalized_block_number,finalized_block_hash) SELECT 'claim',id,chain_id,lower(verifying_contract),$2,'success',20,$3,$3,now(),21,$3 FROM claim_outbox WHERE id=$1",[job,hash,block]);
  expect((await app.inject({url,headers})).json()).toMatchObject({status:'included',finality:'finalized',chainOutcome:'success'});
  expect((await submit()).json()).toMatchObject({status:'included',finality:'finalized'});
  expect((await app.inject({url,headers:{authorization:'Bearer '+other}})).statusCode).toBe(404);
  await pool.query("UPDATE chain_receipt_observations SET observed_status='reverted' WHERE source='claim' AND job_id=$1",[job]);
  expect((await app.inject({url,headers})).json()).toMatchObject({status:'failed',finality:'finalized',chainOutcome:'reverted',reason:'TRANSACTION_REVERTED'});
  await pool.query('UPDATE claim_outbox SET transaction_hash=$2 WHERE id=$1',[job,'0x'+'c'.repeat(64)]);
  expect((await app.inject({url,headers})).json()).toMatchObject({finality:'unverified',chainOutcome:'unverified'});
 }finally{
  await pool.query("DELETE FROM chain_receipt_observations WHERE source='claim' AND job_id=$1",[job]);
  await pool.query('UPDATE claim_outbox SET transaction_hash=NULL,raw_transaction=NULL,relayer_address=NULL WHERE id=$1',[job]);
 }
});
it('reconciles exact claim calldata and distinguishes a finalized revert from success',async()=>{
 const abi=parseAbi(['function claim((uint256 collectionId,address recipient,address issuer,bytes32 nonce,uint256 deadline) voucher,bytes signature)','event CollectionClaimed(uint256 indexed collectionId,address indexed recipient,address indexed issuer)']);
 const row=(await pool.query('SELECT claim,signature FROM claim_outbox WHERE id=$1',[job])).rows[0]!;
 const claim={...row.claim,collectionId:BigInt(row.claim.collectionId),deadline:BigInt(row.claim.deadline)};
 const data=encodeFunctionData({abi,functionName:'claim',args:[claim,row.signature]});
 const raw=await issuer.signTransaction({type:'eip1559',chainId:10143,nonce:2,gas:300000n,maxFeePerGas:200000000000n,maxPriorityFeePerGas:1000000000n,to:contract,value:0n,data});
 const hash=keccak256(raw),block=('0x'+'b'.repeat(64)) as `0x${string}`;
 let receipt:ChainReceipt|null={transactionHash:hash,status:'success',blockNumber:20n,blockHash:block,to:contract,from:issuer.address,logs:[{address:contract,transactionHash:hash,logIndex:0,blockNumber:20n,blockHash:block,data:encodeAbiParameters([],[]),topics:encodeEventTopics({abi,eventName:'CollectionClaimed',args:{collectionId:claim.collectionId,recipient:claim.recipient,issuer:claim.issuer}}) as [`0x${string}`,...`0x${string}`[]]}]};
 const adapter:ChainReadAdapter={getHead:async()=>21n,getFinalizedBlock:async()=>({number:21n,hash:block}),getBlock:async number=>({number,hash:block}),getLogs:async()=>[],getReceipt:async()=>receipt};
 const observation=async()=>(await pool.query("SELECT * FROM chain_receipt_observations WHERE source='claim' AND job_id=$1",[job])).rows[0]!;
 await pool.query('UPDATE claim_outbox SET raw_transaction=$2,transaction_hash=$3,relayer_address=$4 WHERE id=$1',[job,raw,hash,issuer.address.toLowerCase()]);
 try{
  // The event omits the voucher nonce, so the signed calldata must bind it.
  await pool.query("UPDATE claim_outbox SET claim=jsonb_set(claim,'{nonce}',to_jsonb($2::text)) WHERE id=$1",[job,'0x'+'e'.repeat(64)]);
  await runFinalityReconciler(pool,adapter,{contracts:[contract]});
  expect(await observation()).toMatchObject({observed_status:'mismatched',finalized_at:null});
  await pool.query('UPDATE claim_outbox SET claim=$2 WHERE id=$1',[job,row.claim]);
  await runFinalityReconciler(pool,adapter,{contracts:[contract]});
  expect(await observation()).toMatchObject({observed_status:'success',receipt_block_number:'20'});
  expect((await observation()).finalized_at).toBeInstanceOf(Date);
  await pool.query("DELETE FROM chain_receipt_observations WHERE source='claim' AND job_id=$1",[job]);
  receipt={...receipt!,status:'reverted',logs:[]};
  await runFinalityReconciler(pool,adapter,{contracts:[contract]});
  expect(await observation()).toMatchObject({observed_status:'reverted'});
  expect((await app.inject({url:`/v1/events/${event}/claims/${job}`,headers})).json()).toMatchObject({status:'failed',finality:'finalized',chainOutcome:'reverted'});
 }finally{
  await pool.query("DELETE FROM chain_receipt_observations WHERE source='claim' AND job_id=$1",[job]);
  await pool.query('UPDATE claim_outbox SET claim=$2,raw_transaction=NULL,transaction_hash=NULL,relayer_address=NULL WHERE id=$1',[job,row.claim]);
 }
});
