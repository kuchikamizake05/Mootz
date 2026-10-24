import type { Pool, PoolClient } from 'pg';
import { keccak256, type Hex } from 'viem';
import { hashOffer, meetDomain, recoverOffer, recoverAccept, RECORD_MEET, uuidBytes32, type MeetOffer, type MeetAccept } from '../protocol/index.js';
export interface RelayJob {
 id:string; posterWallet:string; scannerWallet:string; acceptedAt:bigint;
 offer:MeetOffer; acceptance:MeetAccept; posterSignature:Hex; scannerSignature:Hex;
 chainId:number; verifyingContract:Hex; attempts:number; rawTransaction:Hex|null; transactionHash:Hex|null;
}
export interface MeetRecord {poster:string;scanner:string;acceptedAt:bigint;eventId:string;photoCommitment:string}
export interface MeetTransport {
 validateSigned(job:RelayJob):Promise<void>;
 readRecord(job:RelayJob):Promise<MeetRecord|null>;
 prepare(job:RelayJob):Promise<{hash:Hex;rawTransaction:Hex}>;
 broadcast(raw:Hex):Promise<Hex>;
 receipt(hash:Hex):Promise<'pending'|'success'|'reverted'>;
}
type ComparableJob=Pick<RelayJob,'posterWallet'|'scannerWallet'|'acceptedAt'> & {offer:Pick<MeetOffer,'eventId'|'photoCommitment'>};
export function matchesRecord(job:ComparableJob,record:MeetRecord):boolean {
 return record.poster.toLowerCase()===job.posterWallet.toLowerCase() && record.scanner.toLowerCase()===job.scannerWallet.toLowerCase() && record.acceptedAt===job.acceptedAt && record.eventId.toLowerCase()===job.offer.eventId.toLowerCase() && record.photoCommitment.toLowerCase()===job.offer.photoCommitment.toLowerCase();
}
interface Row {id:string;poster_wallet:string;scanner_wallet:string;accepted_at:Date;offer:MeetOffer;acceptance:MeetAccept;poster_signature:Hex;scanner_signature:Hex;chain_id:string;verifying_contract:Hex;attempts:number;raw_transaction:Hex|null;transaction_hash:Hex|null}
function hydrate(row:Row):RelayJob {
 return {id:row.id,posterWallet:row.poster_wallet,scannerWallet:row.scanner_wallet,acceptedAt:BigInt(Math.floor(row.accepted_at.getTime()/1000)),offer:{...row.offer,issuedAt:BigInt(row.offer.issuedAt),expiresAt:BigInt(row.offer.expiresAt)},acceptance:row.acceptance,posterSignature:row.poster_signature,scannerSignature:row.scanner_signature,chainId:Number(row.chain_id),verifyingContract:row.verifying_contract,attempts:row.attempts,rawTransaction:row.raw_transaction,transactionHash:row.transaction_hash};
}
async function valid(job:RelayJob):Promise<boolean>{
 try {
  if(job.offer.action!==RECORD_MEET || job.acceptance.action!==RECORD_MEET || ![143,10143].includes(job.chainId) || job.posterWallet.toLowerCase()===job.scannerWallet.toLowerCase() || job.offer.meetId!==uuidBytes32(job.id) || job.offer.expiresAt-job.offer.issuedAt!==60n || job.acceptedAt<job.offer.issuedAt || job.acceptedAt>=job.offer.expiresAt)return false;
  const domain=meetDomain(job.chainId,job.verifyingContract);
  return hashOffer(domain,job.offer)===job.acceptance.offerDigest && (await recoverOffer(domain,job.offer,job.posterSignature)).toLowerCase()===job.posterWallet.toLowerCase() && (await recoverAccept(domain,job.acceptance,job.scannerSignature)).toLowerCase()===job.scannerWallet.toLowerCase() && job.offer.poster.toLowerCase()===job.posterWallet.toLowerCase() && job.acceptance.scanner.toLowerCase()===job.scannerWallet.toLowerCase();
 }catch{return false;}
}
async function complete(client:PoolClient,job:Pick<RelayJob,'id'|'transactionHash'>,status:'recorded'|'not_saved',reason:string|null){
 await client.query('BEGIN');
 try {
  await client.query('UPDATE meets SET chain_status=$2,transaction_hash=COALESCE($3,transaction_hash) WHERE id=$1',[job.id,status,job.transactionHash]);
  await client.query('UPDATE meet_outbox SET completed_at=now(),leased_until=NULL,last_error=$2 WHERE meet_id=$1',[job.id,reason]);
  await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');throw error;}
}
export async function processMeetOutbox(pool:Pool,transport:MeetTransport,options:{batchSize?:number;now?:()=>Date;leaseSeconds?:number;chainId?:143|10143}={}){
 const summary={locked:false,processed:0,recorded:0,notSaved:0,retried:0};
 const batch=options.batchSize??20,lease=options.leaseSeconds??60;
 if(!Number.isInteger(batch)||batch<1||batch>100||!Number.isInteger(lease)||lease<1||lease>600)throw new Error('Invalid worker bounds');
 const client=await pool.connect();let locked=false;const leasedIds:string[]=[];
 try {
  locked=(await client.query<{locked:boolean}>('SELECT pg_try_advisory_lock(729610143) AS locked')).rows[0]!.locked;
  if(!locked)return summary;summary.locked=true;
  const rows=await client.query<Row>(`WITH picked AS (
   SELECT o.meet_id FROM meet_outbox o JOIN meets target ON target.id=o.meet_id WHERE target.chain_id=$3 AND o.completed_at IS NULL AND o.next_attempt_at<=now() AND (o.leased_until IS NULL OR o.leased_until<now()) AND (o.raw_transaction IS NOT NULL OR (NOT EXISTS (SELECT 1 FROM meet_outbox active JOIN meets active_meet ON active_meet.id=active.meet_id WHERE active_meet.chain_id=$3 AND active.completed_at IS NULL AND active.raw_transaction IS NOT NULL) AND NOT EXISTS (SELECT 1 FROM claim_outbox active WHERE active.chain_id=$3 AND active.completed_at IS NULL AND active.raw_transaction IS NOT NULL))) ORDER BY (o.raw_transaction IS NOT NULL) DESC,o.next_attempt_at,o.meet_id LIMIT $1 FOR UPDATE SKIP LOCKED
  ), leased AS (
   UPDATE meet_outbox o SET leased_until=now()+make_interval(secs=>$2),attempts=attempts+1 FROM picked WHERE o.meet_id=picked.meet_id RETURNING o.*
  ) SELECT m.*,leased.attempts,leased.raw_transaction,leased.transaction_hash FROM leased JOIN meets m ON m.id=leased.meet_id`,[batch,lease,options.chainId??10143]);
  leasedIds.push(...rows.rows.map(row=>row.id));
  for(const row of rows.rows){
   summary.processed++;let job:RelayJob;
   try{job=hydrate(row);}catch{
    if(row.raw_transaction){await client.query('UPDATE meet_outbox SET next_attempt_at=now()+interval \'30 seconds\',last_error=$2 WHERE meet_id=$1',[row.id,'INVALID_SIGNED_PAYLOAD']);summary.retried++;break;}
    await complete(client,{id:row.id,transactionHash:row.transaction_hash},'not_saved','INVALID_PAYLOAD');summary.notSaved++;continue;
   }
   const finish=async(status:'recorded'|'not_saved',reason:string|null)=>{if(job.rawTransaction&&job.transactionHash&&await transport.receipt(job.transactionHash)==='pending')throw new Error('NONCE_UNRESOLVED');await complete(client,job,status,reason);if(status==='recorded')summary.recorded++;else summary.notSaved++;};
   try {
    if((job.rawTransaction===null)!==(job.transactionHash===null) || (job.rawTransaction!==null && keccak256(job.rawTransaction)!==job.transactionHash))throw new Error('INVALID_SIGNED_TRANSACTION');
    if(job.rawTransaction)await transport.validateSigned(job);
    if(!await valid(job)){await finish('not_saved','INVALID_PAYLOAD');continue;}
    const record=await transport.readRecord(job);
    if(record){await finish(matchesRecord(job,record)?'recorded':'not_saved',matchesRecord(job,record)?null:'RECORD_MISMATCH');continue;}
    const authoritativeNow=options.now?.()??(await client.query<{now:Date}>('SELECT clock_timestamp() AS now')).rows[0]!.now;
    const seconds=BigInt(Math.floor(authoritativeNow.getTime()/1000));
    if(seconds>job.acceptedAt+300n && !job.rawTransaction){await finish('not_saved','RELAY_DEADLINE');continue;}
    if(job.transactionHash){
     const receipt=await transport.receipt(job.transactionHash);
     if(receipt!=='pending'){
      const existing=await transport.readRecord(job);
      if(existing){await finish(matchesRecord(job,existing)?'recorded':'not_saved',matchesRecord(job,existing)?null:'RECORD_MISMATCH');continue;}
      if(receipt==='reverted'){await finish('not_saved','TRANSACTION_REVERTED');continue;}
      throw new Error('READBACK_PENDING');
     }
    }
    if(seconds>job.acceptedAt+300n)throw new Error('NONCE_UNRESOLVED');
    if(!job.rawTransaction){
     const prepared=await transport.prepare(job);if(keccak256(prepared.rawTransaction)!==prepared.hash)throw new Error('INVALID_TRANSACTION_HASH');job.rawTransaction=prepared.rawTransaction;job.transactionHash=prepared.hash;
     await transport.validateSigned(job);
     await client.query('UPDATE meet_outbox SET raw_transaction=$2,transaction_hash=$3 WHERE meet_id=$1',[job.id,job.rawTransaction,job.transactionHash]);
     await client.query('UPDATE meets SET transaction_hash=$2 WHERE id=$1',[job.id,job.transactionHash]);
    }
    const sent=await transport.broadcast(job.rawTransaction);
    if(sent.toLowerCase()!==job.transactionHash?.toLowerCase())throw new Error('HASH_MISMATCH');
    const receipt=await transport.receipt(sent);
    if(receipt!=='pending'){
     const existing=await transport.readRecord(job);
     if(existing){await finish(matchesRecord(job,existing)?'recorded':'not_saved',matchesRecord(job,existing)?null:'RECORD_MISMATCH');continue;}
     if(receipt==='reverted'){await finish('not_saved','TRANSACTION_REVERTED');continue;}
    }
    throw new Error('WAITING_RECEIPT');
   }catch{
    const delay=Math.min(30,2**Math.min(job.attempts,5));
    await client.query('UPDATE meet_outbox SET leased_until=NULL,next_attempt_at=now()+make_interval(secs=>$2),last_error=$3 WHERE meet_id=$1',[job.id,delay,'DEPENDENCY_RETRY']);summary.retried++;break;
   }
  }
  return summary;
 }finally{try{if(leasedIds.length)await client.query('UPDATE meet_outbox SET leased_until=NULL WHERE meet_id=ANY($1::uuid[])',[leasedIds]);}finally{try{if(locked)await client.query('SELECT pg_advisory_unlock(729610143)');}finally{client.release();}}}
}
