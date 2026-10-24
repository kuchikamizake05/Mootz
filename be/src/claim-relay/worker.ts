import type { Pool,PoolClient } from 'pg';
import { keccak256,type Address,type Hex } from 'viem';
import { collectionDomain,recoverClaim,uuidBytes32 } from '../protocol/index.js';
import type { ClaimJob,ClaimState,ClaimTransport } from './types.js';
type Row={id:string;authorization_id:string;account_id:string;event_id:string;chain_id:string;verifying_contract:Address;claim:Record<string,string>;signature:Hex;attempts:number;raw_transaction:Hex|null;transaction_hash:Hex|null;relayer_address:Address|null};
const address=(value:string)=>/^0x[0-9a-fA-F]{40}$/.test(value)&&!/^0x0{40}$/i.test(value);
function hydrate(row:Row):ClaimJob {
 return {id:row.id,authorizationId:row.authorization_id,accountId:row.account_id,eventId:row.event_id,chainId:Number(row.chain_id),verifyingContract:row.verifying_contract,claim:{collectionId:BigInt(row.claim.collectionId!),recipient:row.claim.recipient as Address,issuer:row.claim.issuer as Address,nonce:row.claim.nonce as Hex,deadline:BigInt(row.claim.deadline!)},signature:row.signature,attempts:row.attempts,rawTransaction:row.raw_transaction,transactionHash:row.transaction_hash,relayerAddress:row.relayer_address};
}
async function valid(job:ClaimJob){
 try{return job.chainId===10143&&address(job.verifyingContract)&&address(job.claim.recipient)&&address(job.claim.issuer)&&job.claim.collectionId>0n&&job.claim.collectionId<2n**256n&&job.claim.deadline>0n&&job.claim.deadline<2n**256n&&/^0x[0-9a-fA-F]{64}$/.test(job.claim.nonce)&&(await recoverClaim(collectionDomain(job.chainId,job.verifyingContract),job.claim,job.signature)).toLowerCase()===job.claim.issuer.toLowerCase();}catch{return false;}
}
function validState(job:ClaimJob,state:ClaimState){return state.eventId.toLowerCase()===uuidBytes32(job.eventId)&&state.cap>0n&&state.totalSupply>=0n&&state.totalSupply<=state.cap&&(state.balance===0n||state.balance===1n)&&state.claimed===(state.balance===1n)&&(!state.nonceUsed||state.claimed);}
async function complete(client:PoolClient,id:string,status:'included'|'failed'|'already_owned',reason:string|null){await client.query('UPDATE claim_outbox SET status=$2,completed_at=clock_timestamp(),leased_until=NULL,last_error=$3 WHERE id=$1',[id,status,reason]);}
export async function processClaimOutbox(pool:Pool,transport:ClaimTransport,options:{batchSize?:number;now?:()=>Date;leaseSeconds?:number}={}){
 const summary={locked:false,processed:0,included:0,failed:0,alreadyOwned:0,retried:0};
 const batch=options.batchSize??20,lease=options.leaseSeconds??60;
 if(!Number.isInteger(batch)||batch<1||batch>100||!Number.isInteger(lease)||lease<1||lease>600)throw Error('Invalid worker bounds');
 const client=await pool.connect();let locked=false;const leasedIds:string[]=[];
 try{
  locked=(await client.query<{locked:boolean}>('SELECT pg_try_advisory_lock(729610143) AS locked')).rows[0]!.locked;if(!locked)return summary;summary.locked=true;
  const rows=await client.query<Row>(`WITH picked AS (
   SELECT o.id FROM claim_outbox o WHERE o.completed_at IS NULL AND o.next_attempt_at<=clock_timestamp() AND (o.leased_until IS NULL OR o.leased_until<clock_timestamp()) AND (o.raw_transaction IS NOT NULL OR (
    NOT EXISTS(SELECT 1 FROM claim_outbox active WHERE active.completed_at IS NULL AND active.raw_transaction IS NOT NULL) AND
    NOT EXISTS(SELECT 1 FROM meet_outbox active WHERE active.completed_at IS NULL AND active.raw_transaction IS NOT NULL)))
   ORDER BY (o.raw_transaction IS NOT NULL) DESC,o.next_attempt_at,o.id LIMIT $1 FOR UPDATE SKIP LOCKED
  ) UPDATE claim_outbox o SET leased_until=clock_timestamp()+make_interval(secs=>$2),attempts=o.attempts+1 FROM picked WHERE o.id=picked.id RETURNING o.*`,[batch,lease]);
  rows.rows.sort((a,b)=>Number(b.raw_transaction!==null)-Number(a.raw_transaction!==null)||a.id.localeCompare(b.id));
  leasedIds.push(...rows.rows.map(row=>row.id));
  for(const row of rows.rows){
   summary.processed++;let job:ClaimJob;
   const finish=async(status:'included'|'failed'|'already_owned',reason:string|null)=>{await complete(client,row.id,status,reason);if(status==='included')summary.included++;else if(status==='already_owned')summary.alreadyOwned++;else summary.failed++;};
   const retry=async()=>{await client.query('UPDATE claim_outbox SET leased_until=NULL,next_attempt_at=clock_timestamp()+make_interval(secs=>$2),last_error=$3 WHERE id=$1',[row.id,Math.min(30,2**Math.min(row.attempts,5)),'DEPENDENCY_RETRY']);summary.retried++;};
   try{job=hydrate(row);}catch{if(row.raw_transaction){await retry();break;}await finish('failed','INVALID_PAYLOAD');continue;}
   try{
    const seconds=BigInt(Math.floor((options.now?.()??(await client.query<{now:Date}>('SELECT clock_timestamp() AS now')).rows[0]!.now).getTime()/1000));
    const payloadValid=await valid(job);
    if(job.rawTransaction){
     // A signed nonce remains reserved until the original transaction is mined.
     if(!payloadValid||!job.transactionHash||!job.relayerAddress||keccak256(job.rawTransaction).toLowerCase()!==job.transactionHash.toLowerCase())throw Error('INVALID_SIGNED_PAYLOAD');
     await transport.validateSigned(job);
     const receipt=await transport.receipt(job);
     if(receipt==='reverted'||receipt==='mismatched'){await finish('failed',receipt==='reverted'?'TRANSACTION_REVERTED':'RECEIPT_MISMATCH');continue;}
     if(receipt==='matched'){
      const state=await transport.read(job);if(!validState(job,state)||!state.claimed||!state.nonceUsed)throw Error('READBACK_PENDING');await finish('included',null);continue;
     }
     if(seconds>job.claim.deadline)throw Error('NONCE_UNRESOLVED');
    }else{
     if(!payloadValid){await finish('failed','INVALID_PAYLOAD');continue;}
     const state=await transport.read(job);
     if(!validState(job,state)){await finish('failed','COLLECTION_MISMATCH');continue;}
     if(state.claimed){await finish('already_owned',null);continue;}
     if(seconds>job.claim.deadline){await finish('failed','CLAIM_EXPIRED');continue;}
     if(!state.issuerAuthorized){await finish('failed','ISSUER_UNAVAILABLE');continue;}
     if(state.totalSupply>=state.cap){await finish('failed','SOLD_OUT');continue;}
     const prepared=await transport.prepare(job);
     if(!address(prepared.sender)||keccak256(prepared.rawTransaction).toLowerCase()!==prepared.hash.toLowerCase())throw Error('INVALID_TRANSACTION');
     job.rawTransaction=prepared.rawTransaction;job.transactionHash=prepared.hash;job.relayerAddress=prepared.sender;
     await transport.validateSigned(job);
     await client.query('UPDATE claim_outbox SET raw_transaction=$2,transaction_hash=$3,relayer_address=$4 WHERE id=$1',[job.id,job.rawTransaction,job.transactionHash.toLowerCase(),job.relayerAddress.toLowerCase()]);
    }
    const sent=await transport.broadcast(job.rawTransaction!);if(sent.toLowerCase()!==job.transactionHash!.toLowerCase())throw Error('HASH_MISMATCH');
    const receipt=await transport.receipt(job);
    if(receipt==='reverted'||receipt==='mismatched'){await finish('failed',receipt==='reverted'?'TRANSACTION_REVERTED':'RECEIPT_MISMATCH');continue;}
    if(receipt==='matched'){const state=await transport.read(job);if(validState(job,state)&&state.claimed&&state.nonceUsed){await finish('included',null);continue;}}
    throw Error('WAITING_RECEIPT');
   }catch{await retry();break;}
  }
  return summary;
 }finally{try{if(leasedIds.length)await client.query('UPDATE claim_outbox SET leased_until=NULL WHERE id=ANY($1::uuid[])',[leasedIds]);}finally{try{if(locked)await client.query('SELECT pg_advisory_unlock(729610143)');}finally{client.release();}}}
}
