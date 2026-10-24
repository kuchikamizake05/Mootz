import type { Pool } from 'pg';
import { decodeEventLog, encodeFunctionData, keccak256, parseAbi, parseAbiItem, parseTransaction, recoverTransactionAddress, type Address, type Hex, type TransactionSerialized } from 'viem';
import { uuidBytes32 } from '../protocol/index.js';
import type { ChainLog, ChainReadAdapter, ChainReceipt, IndexContract, IndexedEventName } from './types.js';

const eventAbi = {
  MeetRecorded: parseAbiItem('event MeetRecorded(bytes32 indexed meetId,address indexed poster,address indexed scanner,uint256 acceptedAt,bytes32 eventId,bytes32 photoCommitment)'),
  CollectionCreated: parseAbiItem('event CollectionCreated(uint256 indexed collectionId,bytes32 indexed eventId,uint256 cap,string metadataURI)'),
  CollectionClaimed: parseAbiItem('event CollectionClaimed(uint256 indexed collectionId,address indexed recipient,address indexed issuer)')
};
const meetWriteAbi=parseAbi(['function recordMeet((bytes32 action,bytes32 meetId,bytes32 momentId,bytes32 photoCommitment,address poster,bytes32 nonce,uint256 issuedAt,uint256 expiresAt,bytes32 eventId) offer,(bytes32 action,bytes32 offerDigest,address scanner) acceptance,bytes posterSignature,bytes scannerSignature,uint256 acceptedAt)']);
const claimWriteAbi=parseAbi(['function claim((uint256 collectionId,address recipient,address issuer,bytes32 nonce,uint256 deadline) voucher,bytes signature)']);
const eq=(a:string|null|undefined,b:string|null|undefined)=>Boolean(a&&b&&a.toLowerCase()===b.toLowerCase());
const asJson=(v:unknown):string=>JSON.stringify(v,(_k,x)=>typeof x==='bigint'?x.toString():x);
function decode(name:IndexedEventName,log:ChainLog):Record<string,unknown>{
 const topics=log.topics as [Hex,...Hex[]];
 const decoded=decodeEventLog({abi:[eventAbi[name]],data:log.data,topics,strict:true});
 if(decoded.eventName!==name)throw new Error('Unexpected event');
 return decoded.args as Record<string,unknown>;
}

/** Store finalized-range logs and advance one durable cursor in the same transaction. */
export async function runChainIndexer(pool:Pool,adapter:ChainReadAdapter,contracts:readonly IndexContract[],options:{initialChunk?:number;minChunk?:number;maxChunk?:number;maxRanges?:number;chainId?:143|10143}={}) {
 const chainId=options.chainId??10143;
 if(![143,10143].includes(chainId))throw new Error('Unsupported Monad chain');
 const initial=options.initialChunk??2000,min=options.minChunk??1,max=options.maxChunk??10000;
 const maxRanges=options.maxRanges??20;
 if(!Number.isInteger(initial)||!Number.isInteger(min)||!Number.isInteger(max)||!Number.isInteger(maxRanges)||maxRanges<1||min<1||initial<min||max<initial)throw new Error('Invalid chain index bounds');
 const finalized=await adapter.getFinalizedBlock(); if(!finalized)return {ranges:0,events:0,finalizedThrough:null as bigint|null};
 let ranges=0,events=0;
 const lock=await pool.connect();
 if(!(await lock.query<{locked:boolean}>('SELECT pg_try_advisory_lock(729610144) AS locked')).rows[0]!.locked){lock.release();return {ranges,events,finalizedThrough:finalized.number};}
 try {
 for(const contract of contracts){
  if(!contract.streams.length||contract.startBlock<0n)throw new Error('Invalid index contract');
  for(const stream of contract.streams){
   const key=contract.address.toLowerCase();
   await pool.query(`INSERT INTO chain_sync_cursors(chain_id,contract_address,stream,next_block) VALUES($4,$1,$2,$3) ON CONFLICT DO NOTHING`,[key,stream,contract.startBlock.toString(),chainId]);
   const c=await pool.query<{next_block:string}>('SELECT next_block FROM chain_sync_cursors WHERE chain_id=$3 AND contract_address=$1 AND stream=$2',[key,stream,chainId]);
   let from=BigInt(c.rows[0]!.next_block),chunk=initial,streamRanges=0;
   while(from<=finalized.number&&streamRanges<maxRanges){
    const to=from+BigInt(chunk)-1n>finalized.number?finalized.number:from+BigInt(chunk)-1n;
    let logs:readonly ChainLog[];
    try{logs=await adapter.getLogs({address:contract.address,fromBlock:from,toBlock:to,eventName:stream});}
    catch(error){if(chunk<=min)throw error;chunk=Math.max(min,Math.floor(chunk/2));continue;}
    const good: {log:ChainLog;payload:Record<string,unknown>}[]=[];
    const canonical=new Map<string,string>();
    for(const log of logs){
     if(!eq(log.address,contract.address)||log.blockNumber<from||log.blockNumber>to||!/^0x[0-9a-f]{64}$/i.test(log.transactionHash)||!/^0x[0-9a-f]{64}$/i.test(log.blockHash)||!Number.isInteger(log.logIndex)||log.logIndex<0)throw new Error('Invalid indexed log');
     try{const key=log.blockNumber.toString();let hash=canonical.get(key);if(!hash){const block=await adapter.getBlock(log.blockNumber);if(!block||block.number!==log.blockNumber)throw new Error('Canonical block unavailable');hash=block.hash.toLowerCase();canonical.set(key,hash);}if(!eq(hash,log.blockHash))throw new Error('Noncanonical indexed log');good.push({log,payload:decode(stream,log)});}catch{throw new Error('Invalid or noncanonical indexed log');}
    }
    try{await lock.query('BEGIN');
     for(const {log,payload} of good)await lock.query(`INSERT INTO chain_sync_events(chain_id,contract_address,transaction_hash,log_index,block_number,block_hash,event_name,payload,finalized_at,finalized_block_number,finalized_block_hash)
      VALUES($10,$1,$2,$3,$4,$5,$6,$7::jsonb,clock_timestamp(),$8,$9) ON CONFLICT(chain_id,contract_address,transaction_hash,log_index) DO NOTHING`,[key,log.transactionHash.toLowerCase(),log.logIndex,log.blockNumber.toString(),log.blockHash.toLowerCase(),stream,asJson(payload),finalized.number.toString(),finalized.hash.toLowerCase(),chainId]);
     await lock.query('UPDATE chain_sync_cursors SET next_block=$3,updated_at=clock_timestamp() WHERE chain_id=$5 AND contract_address=$1 AND stream=$2 AND next_block=$4',[key,stream,(to+1n).toString(),from.toString(),chainId]);
     await lock.query('COMMIT');
    }catch(error){await lock.query('ROLLBACK');throw error;}
    ranges++;streamRanges++;events+=good.length;from=to+1n;
    if(chunk<initial)chunk=Math.min(initial,chunk*2);
   }
  }
 }
 return {ranges,events,finalizedThrough:finalized.number};
 } finally {await lock.query('SELECT pg_advisory_unlock(729610144)');lock.release();}
}

interface ReceiptJob { source:'meet'|'claim';id:string;chain_id:string;verifying_contract:Address;transaction_hash:Hex;raw_transaction:Hex|null;relayer_address:Address|null;expected:Record<string,unknown> }
function eventMatches(job:ReceiptJob,log:ChainLog):boolean {
 try{
  if(!eq(job.verifying_contract,log.address))return false;
  if(job.source==='meet'){
   const row=decode('MeetRecorded',log),offer=job.expected.offer as Record<string,unknown>;
   const seconds=BigInt(Math.floor(new Date(job.expected.accepted_at as string).getTime()/1000));
   return eq(row.meetId as string,uuidBytes32(job.id))&&eq(row.poster as string,job.expected.poster_wallet as string)&&
    eq(row.scanner as string,job.expected.scanner_wallet as string)&&row.acceptedAt===seconds&&eq(row.eventId as string,offer.eventId as string)&&eq(row.photoCommitment as string,offer.photoCommitment as string);
  }
  const row=decode('CollectionClaimed',log);
  const claim=job.expected.claim as Record<string,unknown>;
  return row.collectionId===BigInt(String(claim.collectionId))&&eq(row.recipient as string,String(claim.recipient))&&eq(row.issuer as string,String(claim.issuer));
 }catch{return false;}
}
async function signedTransactionMatches(job:ReceiptJob,receipt:ChainReceipt):Promise<boolean>{
 try{
  if(!job.raw_transaction||!eq(keccak256(job.raw_transaction),job.transaction_hash))return false;
  const tx=parseTransaction(job.raw_transaction as TransactionSerialized),expected=job.expected;
  const to=job.verifying_contract;
  let data:Hex;
  if(job.source==='meet'){
   const offer=expected.offer as Record<string,unknown>,acceptance=expected.acceptance as Record<string,unknown>;
   const acceptedAt=BigInt(Math.floor(new Date(expected.accepted_at as string).getTime()/1000));
   data=encodeFunctionData({abi:meetWriteAbi,functionName:'recordMeet',args:[offer as never,acceptance as never,expected.poster_signature as Hex,expected.scanner_signature as Hex,acceptedAt]});
  }else{
   const claim=expected.claim as Record<string,string>;
   data=encodeFunctionData({abi:claimWriteAbi,functionName:'claim',args:[{collectionId:BigInt(claim.collectionId!),recipient:claim.recipient as Address,issuer:claim.issuer as Address,nonce:claim.nonce as Hex,deadline:BigInt(claim.deadline!)},expected.signature as Hex]});
  }
  if(tx.type!=='eip1559'||tx.chainId!==Number(job.chain_id)||!eq(tx.to,to)||(tx.value??0n)!==0n||!eq(tx.data,data))return false;
  const recovered=await recoverTransactionAddress({serializedTransaction:job.raw_transaction as TransactionSerialized});
  return eq(recovered,receipt.from)&&(!job.relayer_address||eq(recovered,job.relayer_address));
 }catch{return false;}
}
async function touchObservation(pool:Pool,job:ReceiptJob){
 await pool.query(`INSERT INTO chain_receipt_observations(source,job_id,chain_id,contract_address,transaction_hash,observed_status,checked_at)
  VALUES($1,$2,$3,$4,$5,'pending',clock_timestamp()) ON CONFLICT(source,job_id) DO UPDATE SET checked_at=clock_timestamp()`,
 [job.source,job.id,job.chain_id,job.verifying_contract.toLowerCase(),job.transaction_hash.toLowerCase()]);
}

/** Reconcile every provisional/completed receipt without changing jobs or their public status. */
export async function runFinalityReconciler(pool:Pool,adapter:ChainReadAdapter,options:{batchSize?:number;contracts:readonly Address[];chainId?:143|10143}) {
 const chainId=options.chainId??10143;
 if(![143,10143].includes(chainId))throw new Error('Unsupported Monad chain');
 const limit=options.batchSize??200;if(!Number.isInteger(limit)||limit<1||limit>1000)throw new Error('Invalid reconciliation batch size');
 if(!options.contracts.length)throw new Error('No configured chain contracts');
 const finalized=await adapter.getFinalizedBlock();
 const jobs=await pool.query<ReceiptJob>(`SELECT 'meet'::text AS source,m.id,m.chain_id::text,m.verifying_contract,o.transaction_hash,o.raw_transaction,NULL::text AS relayer_address,
   jsonb_build_object('offer',m.offer,'acceptance',m.acceptance,'accepted_at',m.accepted_at,'poster_wallet',m.poster_wallet,'scanner_wallet',m.scanner_wallet,'poster_signature',m.poster_signature,'scanner_signature',m.scanner_signature) AS expected,coalesce(r.checked_at,'-infinity'::timestamptz) AS checked_at
   FROM meets m JOIN meet_outbox o ON o.meet_id=m.id LEFT JOIN chain_receipt_observations r ON r.source='meet' AND r.job_id=m.id AND r.chain_id=m.chain_id AND lower(r.contract_address)=lower(m.verifying_contract) AND lower(r.transaction_hash)=lower(o.transaction_hash)
   WHERE o.transaction_hash IS NOT NULL AND m.chain_id=$3 AND lower(m.verifying_contract)=ANY($2::text[]) AND r.finalized_at IS NULL
   UNION ALL
   SELECT 'claim'::text,c.id,c.chain_id::text,c.verifying_contract,c.transaction_hash,c.raw_transaction,c.relayer_address,jsonb_build_object('claim',c.claim,'signature',c.signature) AS expected,coalesce(r.checked_at,'-infinity'::timestamptz) AS checked_at
   FROM claim_outbox c LEFT JOIN chain_receipt_observations r ON r.source='claim' AND r.job_id=c.id AND r.chain_id=c.chain_id AND lower(r.contract_address)=lower(c.verifying_contract) AND lower(r.transaction_hash)=lower(c.transaction_hash)
   WHERE c.transaction_hash IS NOT NULL AND c.chain_id=$3 AND lower(c.verifying_contract)=ANY($2::text[]) AND r.finalized_at IS NULL
   ORDER BY checked_at,source,id LIMIT $1`,[limit,options.contracts.map(a=>a.toLowerCase()),chainId]);
 let checked=0,finalizedSuccess=0,finalizedOther=0;
 for(const job of jobs.rows){checked++;
  let observed:'pending'|'success'|'reverted'|'mismatched'='pending';let receiptBlock:bigint|null=null,receiptHash:Hex|null=null,canonicalHash:Hex|null=null;
  let finalBlock:bigint|null=null,finalHash:Hex|null=null,finalizedAt:boolean|null=null;
  let receipt:ChainReceipt|null;
  try{receipt=await adapter.getReceipt(job.transaction_hash);}catch{
   await touchObservation(pool,job);
   continue;
  }
  if(!receipt){
   const prior=await pool.query('UPDATE chain_receipt_observations SET checked_at=clock_timestamp() WHERE source=$1 AND job_id=$2 AND transaction_hash=$3 AND finalized_at IS NOT NULL',[job.source,job.id,job.transaction_hash.toLowerCase()]);
   if(prior.rowCount)continue;
  }
  if(receipt){
   if(!eq(receipt.transactionHash,job.transaction_hash)||!eq(receipt.to,job.verifying_contract)||!(await signedTransactionMatches(job,receipt)))observed='mismatched';
   else {receiptBlock=receipt.blockNumber;receiptHash=receipt.blockHash;
    const semantics=receipt.status==='success'&&receipt.logs.some(l=>eq(l.transactionHash,job.transaction_hash)&&l.blockNumber===receipt.blockNumber&&eq(l.blockHash,receipt.blockHash)&&eventMatches(job,l));
    observed=receipt.status==='reverted'?'reverted':semantics?'success':'mismatched';
   }
   if(receiptBlock!==null&&finalized&&receipt.blockNumber<=finalized.number){const block=await adapter.getBlock(receipt.blockNumber);canonicalHash=block?.number===receipt.blockNumber?block.hash:null;
    if(!block||block.number!==receipt.blockNumber){await touchObservation(pool,job);continue;}
    if(eq(block.hash,receipt.blockHash)){if(observed!=='mismatched'){finalBlock=finalized.number;finalHash=finalized.hash;finalizedAt=true;}}else observed='pending';
   }
  }
  await pool.query(`INSERT INTO chain_receipt_observations(source,job_id,chain_id,contract_address,transaction_hash,observed_status,receipt_block_number,receipt_block_hash,canonical_block_hash,finalized_at,finalized_block_number,finalized_block_hash,checked_at)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,CASE WHEN $10 THEN clock_timestamp() ELSE NULL END,$11,$12,clock_timestamp())
   ON CONFLICT(source,job_id) DO UPDATE SET chain_id=EXCLUDED.chain_id,contract_address=EXCLUDED.contract_address,transaction_hash=EXCLUDED.transaction_hash,
    observed_status=EXCLUDED.observed_status,receipt_block_number=EXCLUDED.receipt_block_number,receipt_block_hash=EXCLUDED.receipt_block_hash,
    canonical_block_hash=EXCLUDED.canonical_block_hash,finalized_at=CASE WHEN EXCLUDED.finalized_at IS NOT NULL THEN EXCLUDED.finalized_at ELSE NULL END,
    finalized_block_number=EXCLUDED.finalized_block_number,finalized_block_hash=EXCLUDED.finalized_block_hash,checked_at=EXCLUDED.checked_at
    WHERE chain_receipt_observations.finalized_at IS NULL OR chain_receipt_observations.transaction_hash<>EXCLUDED.transaction_hash`,
   [job.source,job.id,job.chain_id,job.verifying_contract.toLowerCase(),job.transaction_hash.toLowerCase(),observed,receiptBlock?.toString()??null,receiptHash?.toLowerCase()??null,canonicalHash?.toLowerCase()??null,finalizedAt===true,finalBlock?.toString()??null,finalHash?.toLowerCase()??null]);
  if(finalizedAt&&observed==='success')finalizedSuccess++;else if(finalizedAt)finalizedOther++;
 }
 return {checked,finalizedSuccess,finalizedOther};
}

export type { ChainLog, ChainReadAdapter, IndexContract, IndexedEventName } from './types.js';
