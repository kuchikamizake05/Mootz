import { decodeEventLog, encodeFunctionData, keccak256, parseTransaction, recoverTransactionAddress, stringToHex, TransactionReceiptNotFoundError, type Abi, type Account, type Address, type PublicClient, type WalletClient, type TransactionSerialized } from 'viem';
import { DEFAULT_FEE_POLICY, isWithinFeePolicy, type FeePolicy } from '../chain/fees.js';
import { canonicalSignature, collectionDomain, hashClaim, recoverClaim, uuidBytes32 } from '../protocol/index.js';
import type { ClaimJob, ClaimState, ClaimTransport } from './types.js';
const maxGas=1000000n;
const same=(a:string,b:string)=>a.toLowerCase()===b.toLowerCase();
const failure=()=>new Error('Claim relay unavailable');
export function createViemClaimTransport(options:{publicClient:PublicClient;walletClient:WalletClient;account:Account;abi:Abi;chainId:number;verifyingContract:Address;feePolicy?:FeePolicy}):ClaimTransport {
 const {publicClient:client,walletClient,account,abi,chainId,verifyingContract}=options;
 const feePolicy=options.feePolicy??DEFAULT_FEE_POLICY;
 const domain=collectionDomain(chainId,verifyingContract);
 const data=(job:ClaimJob)=>encodeFunctionData({abi,functionName:'claim',args:[job.claim,canonicalSignature(job.signature)]});
 async function snapshot(job:ClaimJob){
  if(![143,10143].includes(chainId)||job.chainId!==chainId||!same(job.verifyingContract,verifyingContract)||await client.getChainId()!==chainId)throw failure();
  const blockNumber=await client.getBlockNumber();
  const code=await client.getCode({address:verifyingContract,blockNumber});if(!code||code==='0x')throw failure();
  if(await client.readContract({address:verifyingContract,abi,functionName:'hashClaim',args:[job.claim],blockNumber})!==hashClaim(domain,job.claim))throw failure();
  return blockNumber;
 }
 async function state(job:ClaimJob):Promise<{state:ClaimState;blockNumber:bigint}>{
  const blockNumber=await snapshot(job);
  const read=(functionName:string,args:readonly unknown[])=>client.readContract({address:verifyingContract,abi,functionName,args,blockNumber});
  const [collection,totalSupply,balance,claimed,nonceUsed,role,code]=await Promise.all([read('collections',[job.claim.collectionId]),read('totalSupply',[job.claim.collectionId]),read('balanceOf',[job.claim.recipient,job.claim.collectionId]),read('claimed',[job.claim.collectionId,job.claim.recipient]),read('usedNonces',[job.claim.issuer,job.claim.nonce]),read('hasRole',[keccak256(stringToHex('ISSUER_ROLE')),job.claim.issuer]),client.getCode({address:job.claim.issuer,blockNumber})]);
  if(!Array.isArray(collection)||collection.length!==3||collection[0]!==uuidBytes32(job.eventId)||typeof collection[1]!=='bigint'||collection[1]<=0n||job.claim.collectionId<=0n||typeof totalSupply!=='bigint'||totalSupply<0n||totalSupply>collection[1]||typeof balance!=='bigint'||balance<0n||balance>1n||balance>totalSupply||typeof claimed!=='boolean'||claimed!==(balance===1n)||typeof nonceUsed!=='boolean'||typeof role!=='boolean'||(code&&code!=='0x'))throw failure();
  return {state:{eventId:collection[0] as ClaimState['eventId'],cap:collection[1],totalSupply,balance,claimed,nonceUsed,issuerAuthorized:role},blockNumber};
 }
 function bounds(tx:{gas?:bigint|undefined;maxFeePerGas?:bigint|undefined;maxPriorityFeePerGas?:bigint|undefined}){if(tx.gas===undefined||tx.gas<=0n||tx.gas>maxGas||!isWithinFeePolicy(tx,feePolicy))throw failure();}
 const transport:ClaimTransport={
  async read(job){try{return (await state(job)).state;}catch{throw failure();}},
  async prepare(job){try{
   if(same(account.address,job.claim.issuer))throw failure();
   const current=await state(job),s=current.state;
   if(s.balance!==0n||s.claimed||s.nonceUsed||!s.issuerAuthorized||s.totalSupply>=s.cap||!same(await recoverClaim(domain,job.claim,job.signature),job.claim.issuer))throw failure();
   const block=await client.getBlock({blockNumber:current.blockNumber});if(job.claim.deadline<block.timestamp)throw failure();
   const prepared=await walletClient.prepareTransactionRequest({account,to:verifyingContract,data:data(job),value:0n,chain:walletClient.chain,type:'eip1559'});bounds(prepared);
   if(prepared.chainId!==chainId||prepared.type!=='eip1559'||!prepared.to||!same(prepared.to,verifyingContract)||prepared.data!==data(job)||(prepared.value??0n)!==0n)throw failure();
   const rawTransaction=await walletClient.signTransaction({...prepared,account,chain:walletClient.chain});const hash=keccak256(rawTransaction);
   await transport.validateSigned({...job,rawTransaction,transactionHash:hash,relayerAddress:account.address});return {rawTransaction,hash,sender:account.address};
  }catch{throw failure();}},
  async validateSigned(job){try{
   if(same(account.address,job.claim.issuer)||![143,10143].includes(chainId)||job.chainId!==chainId||!same(job.verifyingContract,verifyingContract)||!job.rawTransaction||!job.transactionHash||!job.relayerAddress||!same(job.relayerAddress,account.address)||keccak256(job.rawTransaction)!==job.transactionHash)throw failure();
   const tx=parseTransaction(job.rawTransaction);if(tx.type!=='eip1559'||tx.chainId!==chainId||!tx.to||!same(tx.to,verifyingContract)||(tx.value??0n)!==0n||tx.data!==data(job)||!same(await recoverTransactionAddress({serializedTransaction:job.rawTransaction as TransactionSerialized}),account.address))throw failure();bounds(tx);
  }catch{throw failure();}},
  async broadcast(serializedTransaction){try{return await client.sendRawTransaction({serializedTransaction});}catch{throw failure();}},
  async receipt(job){try{
   await transport.validateSigned(job);await snapshot(job);
   const receipt=await client.getTransactionReceipt({hash:job.transactionHash!});
   if(!same(receipt.transactionHash,job.transactionHash!)||!receipt.to||!same(receipt.to,verifyingContract)||!same(receipt.from,account.address))return 'mismatched';
   if(receipt.status==='reverted')return 'reverted';if(receipt.status!=='success')return 'mismatched';
   for(const log of receipt.logs){if(!same(log.address,verifyingContract))continue;try{const decoded=decodeEventLog({abi,data:log.data,topics:log.topics,strict:true});const args=decoded.args as {collectionId?:bigint;recipient?:string;issuer?:string};if(decoded.eventName==='CollectionClaimed'&&args.collectionId===job.claim.collectionId&&args.recipient&&same(args.recipient,job.claim.recipient)&&args.issuer&&same(args.issuer,job.claim.issuer))return 'matched';}catch{/* Other contract events do not establish this claim. */}}
   return 'mismatched';
  }catch(error){if(error instanceof TransactionReceiptNotFoundError)return 'pending';throw failure();}}
 };return transport;
}
