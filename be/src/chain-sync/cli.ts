import { createPublicClient, http, type Address } from 'viem';
import { monad, monadTestnet } from 'viem/chains';
import { createDatabase } from '../database.js';
import { createViemChainReadAdapter } from './viem.js';
import { runChainIndexer, runFinalityReconciler } from './index.js';
import type { IndexContract } from './types.js';

function required(name:string):string {const value=process.env[name]?.trim();if(!value)throw new Error(`Missing ${name}`);return value;}
function address(name:string):Address {const value=required(name);if(!/^0x[0-9a-fA-F]{40}$/.test(value)||/^0x0{40}$/i.test(value))throw new Error(`Invalid ${name}`);return value as Address;}
function block(name:string):bigint {const value=required(name);if(!/^\d+$/.test(value))throw new Error(`Invalid ${name}`);return BigInt(value);}
function rpcUrl():string {const value=required('CHAIN_SYNC_RPC_URL');const url=new URL(value);if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.hash||(url.protocol==='http:'&&!['localhost','127.0.0.1','::1'].includes(url.hostname)))throw new Error('Invalid CHAIN_SYNC_RPC_URL');return value;}
async function main(){
 if(process.env.CHAIN_SYNC_ENABLED!=='true')throw new Error('Set CHAIN_SYNC_ENABLED=true to run this read-only worker');
 const chainId=Number(required('CHAIN_SYNC_CHAIN_ID'));if(chainId!==143&&chainId!==10143)throw new Error('Unsupported Monad chain');
 const dbUrl=required('DATABASE_URL'),rpc=rpcUrl();
 const contracts:IndexContract[]=[];
 if(process.env.MEET_REGISTRY_ADDRESS)contracts.push({address:address('MEET_REGISTRY_ADDRESS'),startBlock:block('CHAIN_SYNC_MEET_START_BLOCK'),streams:['MeetRecorded']});
 if(process.env.EVENT_COLLECTION_ADDRESS)contracts.push({address:address('EVENT_COLLECTION_ADDRESS'),startBlock:block('CHAIN_SYNC_COLLECTION_START_BLOCK'),streams:['CollectionCreated','CollectionClaimed']});
 if(!contracts.length)throw new Error('Configure at least one contract and its explicit deployment block');
 const database=createDatabase(dbUrl),client=createPublicClient({chain:chainId===143?monad:monadTestnet,transport:http(rpc,{timeout:10_000,retryCount:0})});
 const adapter=createViemChainReadAdapter(client,contracts.map(c=>c.address),chainId);
 try{
  const finalized=await runFinalityReconciler(database.pool,adapter,{contracts:contracts.map(c=>c.address),chainId});
  const indexing=await runChainIndexer(database.pool,adapter,contracts,{chainId});
  process.stdout.write(JSON.stringify({reconciliation:finalized,indexing},(_key,value)=>typeof value==='bigint'?value.toString():value)+'\n');
 }finally{await database.close();}
}
main().catch(()=>{process.stderr.write('Read-only chain sync failed; check private configuration and provider availability.\n');process.exitCode=1;});
