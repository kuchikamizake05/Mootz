import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { Pool } from 'pg';
import { encodeAbiParameters, encodeEventTopics, encodeFunctionData, keccak256, parseAbi, parseAbiItem, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { migrate } from '../src/db/migrate.ts';
import { runChainIndexer, runFinalityReconciler } from '../src/chain-sync/index.ts';
import type { ChainLog, ChainReadAdapter } from '../src/chain-sync/types.ts';
import { uuidBytes32 } from '../src/protocol/index.ts';

const pool=new Pool({connectionString:process.env.TEST_DATABASE_URL});
const meetAbi=parseAbiItem('event MeetRecorded(bytes32 indexed meetId,address indexed poster,address indexed scanner,uint256 acceptedAt,bytes32 eventId,bytes32 photoCommitment)');
const meetWriteAbi=parseAbi(['function recordMeet((bytes32 action,bytes32 meetId,bytes32 momentId,bytes32 photoCommitment,address poster,bytes32 nonce,uint256 issuedAt,uint256 expiresAt,bytes32 eventId) offer,(bytes32 action,bytes32 offerDigest,address scanner) acceptance,bytes posterSignature,bytes scannerSignature,uint256 acceptedAt)']);
const contract='0x1111111111111111111111111111111111111111' as Address;
const blockHash=(i:number)=>`0x${i.toString(16).padStart(64,'0')}` as Hex;
const txHash=(i:number)=>`0x${(i+100).toString(16).padStart(64,'0')}` as Hex;
function meetLog(id:string,at:bigint):ChainLog {const topics=encodeEventTopics({abi:[meetAbi],eventName:'MeetRecorded',args:{meetId:uuidBytes32(id),poster:'0x2222222222222222222222222222222222222222',scanner:'0x3333333333333333333333333333333333333333'} as never});return {address:contract,transactionHash:txHash(Number(at)),logIndex:0,blockNumber:at,blockHash:blockHash(Number(at)),topics:topics as [Hex,...Hex[]],data:encodeAbiParameters([{type:'uint256'},{type:'bytes32'},{type:'bytes32'}],[at,`0x${'44'.repeat(32)}` as Hex,`0x${'55'.repeat(32)}` as Hex])};}
function adapter(overrides:Partial<ChainReadAdapter>={}):ChainReadAdapter{return {getHead:async()=>30n,getFinalizedBlock:async()=>({number:30n,hash:blockHash(30)}),getBlock:async(number)=>({number,hash:blockHash(Number(number))}),getLogs:async()=>[],getReceipt:async()=>null,...overrides};}
let owner='',scanner='',moment='',meet='';
beforeAll(async()=>{await migrate(pool);owner=(await pool.query("INSERT INTO accounts(provider_subject) VALUES($1) RETURNING id",[`chain-sync:${crypto.randomUUID()}`])).rows[0]!.id;scanner=(await pool.query("INSERT INTO accounts(provider_subject) VALUES($1) RETURNING id",[`chain-sync:${crypto.randomUUID()}`])).rows[0]!.id;moment=(await pool.query("INSERT INTO moments(author_id,source) VALUES($1,'capture') RETURNING id",[owner])).rows[0]!.id;});
afterAll(async()=>{await pool.query('DELETE FROM chain_receipt_observations WHERE job_id=$1',[meet]);await pool.query('DELETE FROM meet_outbox WHERE meet_id=$1',[meet]);await pool.query('DELETE FROM meets WHERE id=$1',[meet]);await pool.query('DELETE FROM meet_offers WHERE id=$1',[meet]);await pool.query('DELETE FROM moments WHERE id=$1',[moment]);await pool.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[[owner,scanner].filter(Boolean)]);await pool.end();});

it('indexes finalized log ranges idempotently and advances the durable cursor',async()=>{
 const testAddress='0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Address;
 await pool.query('DELETE FROM chain_sync_events WHERE contract_address=$1',[testAddress]);await pool.query('DELETE FROM chain_sync_cursors WHERE contract_address=$1',[testAddress]);
 const log={...meetLog(crypto.randomUUID(),11n),address:testAddress};
 const rpc=adapter({getFinalizedBlock:async()=>({number:12n,hash:blockHash(12)}),getBlock:async number=>({number,hash:log.blockHash}),getLogs:vi.fn(async({fromBlock,toBlock})=>fromBlock<=11n&&toBlock>=11n?[log]:[])});
 const config=[{address:testAddress,startBlock:10n,streams:['MeetRecorded'] as const}];
 expect(await runChainIndexer(pool,rpc,config,{initialChunk:2,maxRanges:10})).toMatchObject({events:1,ranges:2,finalizedThrough:12n});
 expect((await pool.query('SELECT payload,finalized_at FROM chain_sync_events WHERE contract_address=$1',[testAddress])).rows).toHaveLength(1);
 expect((await pool.query('SELECT next_block FROM chain_sync_cursors WHERE contract_address=$1',[testAddress])).rows[0]!.next_block).toBe('13');
 expect((await runChainIndexer(pool,rpc,config)).ranges).toBe(0);
 await pool.query('DELETE FROM chain_sync_events WHERE contract_address=$1',[testAddress]);await pool.query('DELETE FROM chain_sync_cursors WHERE contract_address=$1',[testAddress]);
});

it('does not advance a cursor when a finalized-range log disagrees with the canonical block hash',async()=>{
 const testAddress='0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as Address;
 await pool.query('DELETE FROM chain_sync_cursors WHERE contract_address=$1',[testAddress]);
 const log={...meetLog(crypto.randomUUID(),11n),address:testAddress};
 const rpc=adapter({getFinalizedBlock:async()=>({number:12n,hash:blockHash(12)}),getBlock:async number=>({number,hash:blockHash(99)}),getLogs:async()=>[log]});
 await expect(runChainIndexer(pool,rpc,[{address:testAddress,startBlock:10n,streams:['MeetRecorded']}],{initialChunk:2})).rejects.toThrow('Invalid or noncanonical indexed log');
 expect((await pool.query('SELECT next_block FROM chain_sync_cursors WHERE contract_address=$1',[testAddress])).rows[0]!.next_block).toBe('10');
 await pool.query('DELETE FROM chain_sync_cursors WHERE contract_address=$1',[testAddress]);
});

it('bounds ranges per stream and resumes the next historical block on the following run',async()=>{
 const testAddress='0xcccccccccccccccccccccccccccccccccccccccc' as Address;
 await pool.query('DELETE FROM chain_sync_cursors WHERE contract_address=$1',[testAddress]);
 const rpc=adapter({getFinalizedBlock:async()=>({number:20n,hash:blockHash(20)}),getLogs:async()=>[]});
 const config=[{address:testAddress,startBlock:10n,streams:['MeetRecorded','CollectionClaimed'] as const}];
 expect((await runChainIndexer(pool,rpc,config,{initialChunk:1,maxRanges:1})).ranges).toBe(2);
 expect((await pool.query('SELECT next_block FROM chain_sync_cursors WHERE contract_address=$1 ORDER BY stream',[testAddress])).rows.map(r=>r.next_block)).toEqual(['11','11']);
 expect((await runChainIndexer(pool,rpc,config,{initialChunk:1,maxRanges:1})).ranges).toBe(2);
 expect((await pool.query('SELECT next_block FROM chain_sync_cursors WHERE contract_address=$1 ORDER BY stream',[testAddress])).rows.map(r=>r.next_block)).toEqual(['12','12']);
 await pool.query('DELETE FROM chain_sync_cursors WHERE contract_address=$1',[testAddress]);
});

it('reduces oversized provider ranges and continues backfill after the smaller range succeeds',async()=>{
 const testAddress='0xdddddddddddddddddddddddddddddddddddddddd' as Address;
 await pool.query('DELETE FROM chain_sync_cursors WHERE contract_address=$1',[testAddress]);
 const getLogs=vi.fn(async({fromBlock,toBlock}:{fromBlock:bigint;toBlock:bigint})=>{if(toBlock-fromBlock+1n>1n)throw Error('range too large');return [];});
 const rpc=adapter({getFinalizedBlock:async()=>({number:12n,hash:blockHash(12)}),getLogs});
 const result=await runChainIndexer(pool,rpc,[{address:testAddress,startBlock:10n,streams:['MeetRecorded']}],{initialChunk:2,minChunk:1});
 expect(result.finalizedThrough).toBe(12n);expect(getLogs.mock.calls.length).toBeGreaterThan(result.ranges);
 expect((await pool.query('SELECT next_block FROM chain_sync_cursors WHERE contract_address=$1',[testAddress])).rows[0]!.next_block).toBe('13');
 await pool.query('DELETE FROM chain_sync_cursors WHERE contract_address=$1',[testAddress]);
});

it('skips index polling while another instance holds its database advisory lock',async()=>{
 const held=await pool.connect();await held.query('SELECT pg_advisory_lock(729610144)');
 try{const getLogs=vi.fn(async()=>[]);const result=await runChainIndexer(pool,adapter({getLogs}),[{address:'0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',startBlock:0n,streams:['MeetRecorded']}]);expect(result.ranges).toBe(0);expect(getLogs).not.toHaveBeenCalled();}
 finally{await held.query('SELECT pg_advisory_unlock(729610144)');held.release();}
});

it('marks only an exact canonical successful Meet receipt finalized and preserves that evidence on receipt absence',async()=>{
 meet=crypto.randomUUID();const acceptedAt=BigInt(Math.floor(Date.now()/1000));const signer=privateKeyToAccount(`0x${'7'.repeat(64)}`);const posterWallet='0x2222222222222222222222222222222222222222',scannerWallet='0x3333333333333333333333333333333333333333';const eventId='0x'+'44'.repeat(32),commitment='0x'+'55'.repeat(32),action='0x'+'66'.repeat(32),digest='0x'+'77'.repeat(32);const offer={action,meetId:uuidBytes32(meet),momentId:uuidBytes32(moment),photoCommitment:commitment,poster:posterWallet,nonce:'0x'+'88'.repeat(32),issuedAt:acceptedAt-10n,expiresAt:acceptedAt+60n,eventId};const acceptance={action,offerDigest:digest,scanner:scannerWallet};const posterSignature='0x1234',scannerSignature='0xabcd';
 const data=encodeFunctionData({abi:meetWriteAbi,functionName:'recordMeet',args:[offer as never,acceptance as never,posterSignature,scannerSignature,acceptedAt]});const raw=await signer.signTransaction({chainId:10143,nonce:1,gas:500000n,maxFeePerGas:1000000000n,maxPriorityFeePerGas:1000000n,to:contract,value:0n,data});const hash=keccak256(raw);
 await pool.query("INSERT INTO meet_offers(id,moment_id,poster_id,poster_wallet,chain_id,verifying_contract,offer,expires_at) VALUES($1,$2,$3,$4,10143,$5,$6,now()+interval '60 seconds')",[meet,moment,owner,posterWallet,contract,JSON.stringify(offer,(_,v)=>typeof v==='bigint'?v.toString():v)]);
 await pool.query("INSERT INTO meets(id,moment_id,poster_id,scanner_id,poster_wallet,scanner_wallet,accepted_at,area_key,server_day,offer,acceptance,poster_signature,scanner_signature,chain_id,verifying_contract,chain_status) VALUES($1,$2,$3,$4,$5,$6,to_timestamp($7),$8,CURRENT_DATE,$9,$10,$11,$12,10143,$13,'recorded')",[meet,moment,owner,scanner,posterWallet,scannerWallet,Number(acceptedAt),meet,JSON.stringify(offer,(_,v)=>typeof v==='bigint'?v.toString():v),JSON.stringify(acceptance),posterSignature,scannerSignature,contract]);
 await pool.query('INSERT INTO meet_outbox(meet_id,transaction_hash,raw_transaction,completed_at) VALUES($1,$2,$3,now())',[meet,hash,raw]);
 const log={...meetLog(meet,acceptedAt),transactionHash:hash,blockNumber:18n,blockHash:blockHash(18)},rpc=adapter({getReceipt:async()=>({transactionHash:hash,status:'success',blockNumber:18n,blockHash:blockHash(18),to:contract,from:signer.address,logs:[log]}),getBlock:async number=>({number,hash:blockHash(Number(number))})});
 const observation=async()=>(await pool.query("SELECT * FROM chain_receipt_observations WHERE source='meet' AND job_id=$1",[meet])).rows[0]!;
 const provisional={...rpc,getFinalizedBlock:async()=>({number:17n,hash:blockHash(17)})};
 await runFinalityReconciler(pool,provisional,{contracts:[contract]});
 expect(await observation()).toMatchObject({observed_status:'success',finalized_at:null});
 await runFinalityReconciler(pool,adapter({getReceipt:async()=>null}),{contracts:[contract]});
 expect(await observation()).toMatchObject({observed_status:'pending',receipt_block_number:null,finalized_at:null});
 await runFinalityReconciler(pool,{...rpc,getReceipt:async()=>{throw Error('synthetic private RPC failure');}},{contracts:[contract]});
 expect((await observation()).observed_status).toBe('pending');
 await runFinalityReconciler(pool,{...rpc,getBlock:async number=>({number,hash:blockHash(999)})},{contracts:[contract]});
 expect(await observation()).toMatchObject({observed_status:'pending',finalized_at:null});
 const validReceipt=await rpc.getReceipt(hash);
 await runFinalityReconciler(pool,{...rpc,getReceipt:async()=>({...validReceipt!,transactionHash:txHash(999)})},{contracts:[contract]});
 expect(await observation()).toMatchObject({observed_status:'mismatched',finalized_at:null});
 await runFinalityReconciler(pool,{...rpc,getReceipt:async()=>({...validReceipt!,logs:[]})},{contracts:[contract]});
 expect(await observation()).toMatchObject({observed_status:'mismatched',finalized_at:null});
 expect(await runFinalityReconciler(pool,rpc,{contracts:[contract]})).toMatchObject({checked:1,finalizedSuccess:1});
 const before=(await pool.query('SELECT observed_status,finalized_at FROM chain_receipt_observations WHERE source=\'meet\' AND job_id=$1',[meet])).rows[0]!;
 expect(before.observed_status).toBe('success');expect(before.finalized_at).toBeInstanceOf(Date);
 await runFinalityReconciler(pool,adapter({getReceipt:async()=>null}),{contracts:[contract]});
 const after=(await pool.query('SELECT observed_status,finalized_at FROM chain_receipt_observations WHERE source=\'meet\' AND job_id=$1',[meet])).rows[0]!;
 expect(after.observed_status).toBe('success');expect(after.finalized_at).toEqual(before.finalized_at);
});
