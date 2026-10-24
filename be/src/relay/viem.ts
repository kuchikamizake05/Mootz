import { encodeFunctionData, keccak256, parseTransaction, recoverTransactionAddress, toHex, TransactionReceiptNotFoundError, type Abi, type Account, type Address, type PublicClient, type WalletClient, type TransactionSerialized } from 'viem';
import { DEFAULT_FEE_POLICY, isWithinFeePolicy, type FeePolicy } from '../chain/fees.js';
import type { MeetTransport, RelayJob } from './worker.js';
const maxGas=2000000n;
const same=(a:string,b:string)=>a.toLowerCase()===b.toLowerCase();
export function createViemMeetTransport(options:{publicClient:PublicClient;walletClient:WalletClient;account:Account;abi:Abi;chainId:number;verifyingContract:Address;feePolicy?:FeePolicy}):MeetTransport {
 const {publicClient:client,walletClient,account,abi,chainId,verifyingContract}=options;
 const feePolicy=options.feePolicy??DEFAULT_FEE_POLICY;
 function deployment(job:RelayJob){if(![143,10143].includes(chainId)||job.chainId!==chainId||!same(job.verifyingContract,verifyingContract))throw new Error('REGISTRY_CONFIGURATION');}
 const data=(job:RelayJob)=>encodeFunctionData({abi,functionName:'recordMeet',args:[job.offer,job.acceptance,job.posterSignature,job.scannerSignature,job.acceptedAt]});
 function bounds(tx:{gas?:bigint|undefined;maxFeePerGas?:bigint|undefined;maxPriorityFeePerGas?:bigint|undefined}){
  if(tx.gas===undefined||tx.gas<=0n||tx.gas>maxGas||!isWithinFeePolicy(tx,feePolicy))throw new Error('INVALID_SIGNED_TRANSACTION');
 }
 async function checks(job:RelayJob){
  deployment(job);
  if(await client.getChainId()!==chainId)throw new Error('WRONG_CHAIN');
  const code=await client.getCode({address:verifyingContract});if(!code||code==='0x')throw new Error('REGISTRY_UNAVAILABLE');
 }
 const transport:MeetTransport={
  async readRecord(job){
   await checks(job);
   const recorded=await client.readContract({address:verifyingContract,abi,functionName:'recorded',args:[job.offer.meetId]});
   if(recorded===false)return null;if(recorded!==true)throw new Error('INVALID_READBACK');
   const record=await client.readContract({address:verifyingContract,abi,functionName:'meets',args:[job.offer.meetId]});
   if(!Array.isArray(record)||record.length!==5||typeof record[0]!=='string'||typeof record[1]!=='string'||typeof record[2]!=='bigint'||typeof record[3]!=='string'||typeof record[4]!=='string')throw new Error('INVALID_READBACK');
   return {poster:record[0],scanner:record[1],acceptedAt:record[2],eventId:record[3],photoCommitment:record[4]};
  },
  async prepare(job){
   await checks(job);
   const role=keccak256(toHex('RELAYER_ROLE'));
   if(await client.readContract({address:verifyingContract,abi,functionName:'hasRole',args:[role,account.address]})!==true)throw new Error('RELAYER_UNAUTHORIZED');
   for(const address of [job.posterWallet,job.scannerWallet]){
    const code=await client.getCode({address:address as Address});if(code&&code!=='0x')throw new Error('WALLET_UNSUPPORTED');
   }
   const prepared=await walletClient.prepareTransactionRequest({account,to:verifyingContract,data:data(job),value:0n,chain:walletClient.chain,type:'eip1559'});
   bounds(prepared);
   if(prepared.chainId!==chainId||prepared.type!=='eip1559'||!prepared.to||!same(prepared.to,verifyingContract)||prepared.data!==data(job)||(prepared.value??0n)!==0n)throw new Error('INVALID_SIGNED_TRANSACTION');
   const rawTransaction=await walletClient.signTransaction({...prepared,account,chain:walletClient.chain});
   const hash=keccak256(rawTransaction);await transport.validateSigned({...job,rawTransaction,transactionHash:hash});return {hash,rawTransaction};
  },
  async validateSigned(job){
   try{
    deployment(job);
    if(!job.rawTransaction||!job.transactionHash||keccak256(job.rawTransaction)!==job.transactionHash)throw new Error();
    const tx=parseTransaction(job.rawTransaction);
    if(tx.type!=='eip1559'||tx.chainId!==chainId||!tx.to||!same(tx.to,verifyingContract)||(tx.value??0n)!==0n||tx.data!==data(job)||!same(await recoverTransactionAddress({serializedTransaction:job.rawTransaction as TransactionSerialized}),account.address))throw new Error();
    bounds(tx);
   }catch{throw new Error('INVALID_SIGNED_TRANSACTION');}
  },
  async broadcast(serializedTransaction){return client.sendRawTransaction({serializedTransaction});},
  async receipt(hash){try{const receipt=await client.getTransactionReceipt({hash});return receipt.status==='success'?'success':'reverted';}catch(error){if(error instanceof TransactionReceiptNotFoundError)return 'pending';throw error;}}
 };return transport;
}
