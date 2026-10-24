import { afterAll,beforeAll,beforeEach,expect,it,vi } from 'vitest';
import { Pool } from 'pg';
import { privateKeyToAccount } from 'viem/accounts';
import { keccak256, type Hex } from 'viem';
import { migrate } from '../src/db/migrate.ts';
import { processMeetOutbox, type MeetTransport, type MeetRecord, type RelayJob } from '../src/relay/worker.ts';
import { meetDomain,meetTypes,RECORD_MEET,OFFCHAIN_MEET,uuidBytes32,hashOffer } from '../src/protocol/index.ts';
const pool=new Pool({connectionString:process.env.TEST_DATABASE_URL});
const poster=privateKeyToAccount(`0x${'1'.repeat(64)}`),scanner=privateKeyToAccount(`0x${'2'.repeat(64)}`);
const domain=meetDomain(10143,'0x1111111111111111111111111111111111111111');
const ids:string[]=[];let moment:string;const created:string[]=[];const now=new Date();
const raw='0x010203' as Hex,hash=keccak256(raw);
let record:MeetRecord|null=null;
const matching=(job:RelayJob):MeetRecord=>({poster:job.posterWallet,scanner:job.scannerWallet,acceptedAt:job.acceptedAt,eventId:job.offer.eventId,photoCommitment:job.offer.photoCommitment});
const transport=():MeetTransport=>({validateSigned:vi.fn(async()=>{}),readRecord:vi.fn(async()=>record),prepare:vi.fn(async()=>({rawTransaction:raw,hash})),broadcast:vi.fn(async()=>hash),receipt:vi.fn(async()=> 'pending' as const)});
async function fixture(action:Hex=RECORD_MEET,age=0){
 const id=crypto.randomUUID();created.push(id);const accepted=new Date(now.getTime()-age*1000);const issuedAt=BigInt(Math.floor(accepted.getTime()/1000))-1n;
 const offer={action,meetId:uuidBytes32(id),momentId:uuidBytes32(moment),photoCommitment:`0x${'3'.repeat(64)}` as Hex,poster:poster.address,nonce:uuidBytes32(crypto.randomUUID()),issuedAt,expiresAt:issuedAt+60n,eventId:`0x${'0'.repeat(64)}` as Hex};
 const acceptance={action,offerDigest:hashOffer(domain,offer),scanner:scanner.address};
 const os=await poster.signTypedData({domain,types:meetTypes,primaryType:'MeetOffer',message:offer});const signature=await scanner.signTypedData({domain,types:meetTypes,primaryType:'MeetAccept',message:acceptance});
 const json=JSON.stringify(offer,(_,v)=>typeof v==='bigint'?v.toString():v);
 await pool.query('INSERT INTO meet_offers(id,moment_id,poster_id,poster_wallet,chain_id,verifying_contract,offer,poster_signature,expires_at) VALUES($1,$2,$3,$4,10143,$5,$6,$7,$8)',[id,moment,ids[0],poster.address,domain.verifyingContract,json,os,new Date(Number(offer.expiresAt)*1000)]);
 await pool.query("INSERT INTO meets(id,moment_id,poster_id,scanner_id,poster_wallet,scanner_wallet,accepted_at,area_key,server_day,offer,acceptance,poster_signature,scanner_signature,chain_id,verifying_contract,chain_status) VALUES($1,$2,$3,$4,$5,$6,$7,$13,CURRENT_DATE,$8,$9,$10,$11,10143,$12,'pending')",[id,moment,ids[0],ids[1],poster.address,scanner.address,accepted,json,JSON.stringify(acceptance),os,signature,domain.verifyingContract,id]);
 await pool.query('INSERT INTO dots(meet_id) VALUES($1)',[id]);await pool.query('INSERT INTO meet_outbox(meet_id) VALUES($1)',[id]);return id;
}
const due=()=>pool.query('UPDATE meet_outbox SET next_attempt_at=now(),leased_until=NULL WHERE meet_id=ANY($1::uuid[])',[created]);
const state=async(id:string)=>(await pool.query('SELECT m.chain_status,o.* FROM meets m JOIN meet_outbox o ON o.meet_id=m.id WHERE m.id=$1',[id])).rows[0];
beforeAll(async()=>{if(!process.env.TEST_DATABASE_URL)throw Error('TEST_DATABASE_URL required');await migrate(pool);for(let i=0;i<2;i++)ids.push((await pool.query('INSERT INTO accounts(provider_subject) VALUES($1) RETURNING id',['relay:'+crypto.randomUUID()])).rows[0].id);moment=(await pool.query("INSERT INTO moments(author_id,source) VALUES($1,'capture') RETURNING id",[ids[0]])).rows[0].id;});
beforeEach(async()=>{record=null;await pool.query('UPDATE meet_outbox SET completed_at=now() WHERE meet_id=ANY($1::uuid[])',[created]);});
afterAll(async()=>{for(const table of ['meet_outbox','dots'])await pool.query(`DELETE FROM ${table} WHERE meet_id=ANY($1::uuid[])`,[created]);await pool.query('DELETE FROM meets WHERE id=ANY($1::uuid[])',[created]);await pool.query('DELETE FROM meet_offers WHERE id=ANY($1::uuid[])',[created]);if(moment)await pool.query('DELETE FROM moments WHERE id=$1',[moment]);await pool.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[ids]);await pool.end();});
it('persists exact signed bytes before ambiguous broadcast and reuses them on retry',async()=>{
 const id=await fixture();const t=transport();t.broadcast=vi.fn(async()=>{const s=await state(id);expect(s.raw_transaction).toBe(raw);expect(s.transaction_hash).toBe(hash);throw Error('secret-provider-url');});
 expect((await processMeetOutbox(pool,t,{now:()=>now})).retried).toBe(1);expect((await state(id)).last_error).toBe('DEPENDENCY_RETRY');
 await due();await processMeetOutbox(pool,t,{now:()=>now});expect(t.prepare).toHaveBeenCalledTimes(1);expect(t.broadcast).toHaveBeenNthCalledWith(2,raw);
});
it('reconciles matching chain record even after deadline and never touches Dot',async()=>{
 const id=await fixture(RECORD_MEET,400);const t=transport();t.readRecord=vi.fn(async job=>matching(job));
 expect((await processMeetOutbox(pool,t,{now:()=>now})).recorded).toBe(1);expect(t.prepare).not.toHaveBeenCalled();expect((await state(id)).chain_status).toBe('recorded');expect((await pool.query('SELECT count(*) FROM dots WHERE meet_id=$1',[id])).rows[0].count).toBe('1');
});
it('rejects wrong readback and opt-out payload without any transport calls for optout',async()=>{
 const wrong=await fixture();let t=transport();t.readRecord=vi.fn(async job=>({...matching(job),acceptedAt:0n}));await processMeetOutbox(pool,t,{now:()=>now});expect((await state(wrong)).last_error).toBe('RECORD_MISMATCH');
 const opted=await fixture(OFFCHAIN_MEET);t=transport();await processMeetOutbox(pool,t,{now:()=>now});expect((await state(opted)).chain_status).toBe('not_saved');expect(t.readRecord).not.toHaveBeenCalled();
});
it('keeps state pending on RPC failure after deadline until absence can be verified',async()=>{
 const id=await fixture(RECORD_MEET,400);const t=transport();t.readRecord=vi.fn(async()=>{throw Error('RPC secret');});await processMeetOutbox(pool,t,{now:()=>now});expect((await state(id)).chain_status).toBe('pending');
 await due();t.readRecord=vi.fn(async()=>null);await processMeetOutbox(pool,t,{now:()=>now});expect((await state(id)).last_error).toBe('RELAY_DEADLINE');
});
it('requires matching readback after success receipt and terminates a reverted transaction',async()=>{
 const id=await fixture();const t=transport();t.receipt=vi.fn(async()=> 'success' as const);let reads=0;t.readRecord=vi.fn(async job=>++reads===1?null:matching(job));await processMeetOutbox(pool,t,{now:()=>now});expect((await state(id)).chain_status).toBe('recorded');
 const reverted=await fixture();const r=transport();r.receipt=vi.fn(async()=> 'reverted' as const);await processMeetOutbox(pool,r,{now:()=>now});expect((await state(reverted)).last_error).toBe('TRANSACTION_REVERTED');
});
it('uses a global session lock to prevent overlapping nonce allocation',async()=>{
 await fixture();const held=await pool.connect();await held.query('SELECT pg_advisory_lock(729610143)');try{const t=transport();expect((await processMeetOutbox(pool,t)).locked).toBe(false);expect(t.prepare).not.toHaveBeenCalled();}finally{await held.query('SELECT pg_advisory_unlock(729610143)');held.release();}
});


it('blocks fresh nonce allocation behind ambiguous signed job across backoff and deadline',async()=>{
 const first=await fixture();const t=transport();t.broadcast=vi.fn(async()=>{throw Error('ambiguous');});await processMeetOutbox(pool,t,{now:()=>now});
 const second=await fixture();expect((await processMeetOutbox(pool,t,{now:()=>now})).processed).toBe(0);expect((await state(second)).raw_transaction).toBeNull();
 await due();const later=new Date(now.getTime()+400000);await processMeetOutbox(pool,t,{now:()=>later});expect((await state(first)).completed_at).toBeNull();expect((await state(second)).raw_transaction).toBeNull();expect(t.prepare).toHaveBeenCalledTimes(1);expect(t.broadcast).toHaveBeenCalledTimes(1);
});
it('blocks Meet nonce allocation behind an unresolved signed Event claim', async () => {
 const meet = await fixture();
 const event = crypto.randomUUID(), mapping = crypto.randomUUID(), authorization = crypto.randomUUID();
 try {
  await pool.query("INSERT INTO events(id,organizer_id,title,starts_at,ends_at) VALUES($1,$2,'Synthetic relay conflict',now(),now()+interval '1 hour')", [event,ids[0]]);
  await pool.query("INSERT INTO event_collections(id,event_id,chain_id,contract_address,collection_id,claim_starts_at,claim_ends_at,display_name,artwork_url) VALUES($1,$2,10143,$3,1,now(),now()+interval '1 hour','Synthetic','https://example.com/synthetic.png')", [mapping,event,domain.verifyingContract]);
  await pool.query("INSERT INTO claim_authorizations(id,account_id,collection_ref,recipient,issuer,nonce,deadline,claim,signature,client_request_id) VALUES($1,$2,$3,$4,$4,$5,now()+interval '1 hour','{}',$6,$7)", [authorization,ids[0],mapping,poster.address.toLowerCase(),'0x'+'11'.repeat(32),'0x'+'11'.repeat(65),crypto.randomUUID()]);
  await pool.query("INSERT INTO claim_outbox(authorization_id,account_id,event_id,chain_id,verifying_contract,claim,signature,raw_transaction,transaction_hash,relayer_address) VALUES($1,$2,$3,10143,$4,'{}','0x',$5,$6,$7)", [authorization,ids[0],event,domain.verifyingContract,raw,hash,poster.address.toLowerCase()]);
  const t = transport();
  expect((await processMeetOutbox(pool,t,{now:()=>now})).processed).toBe(0);
  expect(t.prepare).not.toHaveBeenCalled();
  expect((await state(meet)).raw_transaction).toBeNull();
 } finally {
  await pool.query('DELETE FROM claim_outbox WHERE authorization_id=$1',[authorization]);
  await pool.query('DELETE FROM claim_authorizations WHERE id=$1',[authorization]);
  await pool.query('DELETE FROM event_collections WHERE id=$1',[mapping]);
  await pool.query('DELETE FROM events WHERE id=$1',[event]);
 }
});
it.each(['success','reverted'] as const)('does not release an invalid saved transaction using an unrelated %s receipt or matching record',async receipt=>{
 const id=await fixture();await pool.query('UPDATE meet_outbox SET raw_transaction=$2,transaction_hash=$3 WHERE meet_id=$1',[id,raw,hash]);
 const next=await fixture();const t=transport();t.validateSigned=vi.fn(async()=>{throw Error('INVALID_TRANSACTION');});t.receipt=vi.fn(async()=>receipt);t.readRecord=vi.fn(async job=>matching(job));
 expect((await processMeetOutbox(pool,t,{now:()=>now})).retried).toBe(1);
 expect((await state(id)).completed_at).toBeNull();expect((await state(id)).chain_status).toBe('pending');expect((await state(next)).raw_transaction).toBeNull();expect(t.readRecord).not.toHaveBeenCalled();expect(t.receipt).not.toHaveBeenCalled();expect(t.prepare).not.toHaveBeenCalled();
 expect((await pool.query('SELECT count(*) FROM dots WHERE meet_id=$1',[id])).rows[0].count).toBe('1');
});
it('validates every saved retry and fresh transaction before persisting or broadcasting',async()=>{
 const id=await fixture();const t=transport();t.validateSigned=vi.fn(async()=>{throw Error('INVALID_TRANSACTION');});await processMeetOutbox(pool,t,{now:()=>now});expect((await state(id)).raw_transaction).toBeNull();expect(t.broadcast).not.toHaveBeenCalled();
 t.validateSigned=vi.fn(async()=>{});await due();await processMeetOutbox(pool,t,{now:()=>now});await due();await processMeetOutbox(pool,t,{now:()=>now});expect(t.validateSigned).toHaveBeenCalledTimes(2);
});
it.each(['missing_hash','wrong_hash'] as const)('keeps a persisted transaction unresolved when its hash is %s',async kind=>{
 const id=await fixture();await pool.query('UPDATE meet_outbox SET raw_transaction=$2,transaction_hash=$3 WHERE meet_id=$1',[id,raw,kind==='missing_hash'?null:`0x${'0'.repeat(64)}`]);
 const t=transport();t.receipt=vi.fn(async()=> 'reverted' as const);await processMeetOutbox(pool,t,{now:()=>now});expect((await state(id)).completed_at).toBeNull();expect((await state(id)).chain_status).toBe('pending');expect(t.receipt).not.toHaveBeenCalled();expect(t.readRecord).not.toHaveBeenCalled();
});
