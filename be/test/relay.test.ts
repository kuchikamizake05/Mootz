import { expect, it } from 'vitest';
import { matchesRecord } from '../src/relay/worker.ts';
it('requires every semantic record field to match before declaring success',()=>{
 const job={posterWallet:'0xabc',scannerWallet:'0xdef',acceptedAt:123n,offer:{eventId:'0x00',photoCommitment:'0x11'}} as const;
 const record={poster:'0xABC',scanner:'0xdef',acceptedAt:123n,eventId:'0x00',photoCommitment:'0x11'};
 expect(matchesRecord(job,record)).toBe(true);
 for(const key of ['poster','scanner','eventId','photoCommitment'] as const)expect(matchesRecord(job,{...record,[key]:'bad'})).toBe(false);
 expect(matchesRecord(job,{...record,acceptedAt:124n})).toBe(false);
});


import { readFileSync } from 'node:fs';
import { TransactionReceiptNotFoundError, type PublicClient,type WalletClient,type Abi,type Hex } from 'viem';
import { createViemMeetTransport } from '../src/relay/viem.ts';
import { vi } from 'vitest';
import type { RelayJob } from '../src/relay/worker.ts';
const vectors=JSON.parse(readFileSync(new URL('../../sc/specs/vectors.json',import.meta.url),'utf8'));
const abi=JSON.parse(readFileSync(new URL('../../sc/abi/MeetRegistry.json',import.meta.url),'utf8')) as Abi;
const fixtureJob:RelayJob={id:'11111111-2222-4333-8444-555555555555',posterWallet:vectors.offer.poster,scannerWallet:vectors.accept.scanner,acceptedAt:BigInt(vectors.offer.issuedAt)+1n,offer:{...vectors.offer,issuedAt:BigInt(vectors.offer.issuedAt),expiresAt:BigInt(vectors.offer.expiresAt)},acceptance:vectors.accept,posterSignature:vectors.offerSignature,scannerSignature:vectors.acceptSignature,chainId:10143,verifyingContract:vectors.domain.verifyingContract,attempts:0,rawTransaction:null,transactionHash:null};
function clients(){
 const publicClient={getChainId:vi.fn(async()=>10143),getCode:vi.fn(async({address}:{address:string}):Promise<string>=>address===vectors.domain.verifyingContract?'0x1234':'0x'),readContract:vi.fn(async({functionName}:{functionName:string}):Promise<unknown>=>functionName==='recorded'?false:true),sendRawTransaction:vi.fn(async()=>`0x${'a'.repeat(64)}`),getTransactionReceipt:vi.fn(async()=>({status:'success'}))};
 const walletClient={chain:undefined,prepareTransactionRequest:vi.fn(async(args:object)=>({...args,chainId:10143,nonce:0,gas:500000n,maxFeePerGas:1000000000n,maxPriorityFeePerGas:1n})),signTransaction:vi.fn(async(args:Parameters<typeof relayer.signTransaction>[0])=>relayer.signTransaction(args))};
 const t=createViemMeetTransport({publicClient:publicClient as unknown as PublicClient,walletClient:walletClient as unknown as WalletClient,account:relayer,abi,chainId:10143,verifyingContract:vectors.domain.verifyingContract});return {t,publicClient,walletClient};
}
it('checks recorded flag before accepting zero or unavailable record values',async()=>{
 const {t,publicClient:p}=clients();expect(await t.readRecord(fixtureJob)).toBeNull();expect(p.readContract).toHaveBeenCalledTimes(1);
 p.readContract.mockResolvedValueOnce(true).mockResolvedValueOnce([fixtureJob.posterWallet,fixtureJob.scannerWallet,fixtureJob.acceptedAt,fixtureJob.offer.eventId,fixtureJob.offer.photoCommitment]);expect((await t.readRecord(fixtureJob))?.acceptedAt).toBe(fixtureJob.acceptedAt);
 p.readContract.mockRejectedValueOnce(Error('RPC failure'));await expect(t.readRecord(fixtureJob)).rejects.toThrow();
});
it('rejects wrong chain, missing registry, missing role and delegated participant',async()=>{
 let c=clients();c.publicClient.getChainId.mockResolvedValue(1);await expect(c.t.prepare(fixtureJob)).rejects.toThrow('WRONG_CHAIN');
 c=clients();c.publicClient.getCode.mockResolvedValue('0x');await expect(c.t.prepare(fixtureJob)).rejects.toThrow('REGISTRY_UNAVAILABLE');
 c=clients();c.publicClient.readContract.mockResolvedValue(false);await expect(c.t.prepare(fixtureJob)).rejects.toThrow('RELAYER_UNAUTHORIZED');
 c=clients();c.publicClient.getCode.mockResolvedValue('0xef0100');await expect(c.t.prepare(fixtureJob)).rejects.toThrow('WALLET_UNSUPPORTED');
});
it('prepares canonical ABI recordMeet bytes and distinguishes missing receipt from provider failures',async()=>{
 const {t,publicClient:p,walletClient:w}=clients();const prepared=await t.prepare(fixtureJob);expect(keccak256(prepared.rawTransaction)).toBe(prepared.hash);expect(w.prepareTransactionRequest.mock.calls[0]?.[0]).toMatchObject({value:0n,type:'eip1559'});expect(w.prepareTransactionRequest).toHaveBeenCalledTimes(1);expect(await t.receipt(prepared.hash)).toBe('success');
 p.getTransactionReceipt.mockRejectedValueOnce(new TransactionReceiptNotFoundError({hash:prepared.hash}));expect(await t.receipt(prepared.hash)).toBe('pending');
 p.getTransactionReceipt.mockRejectedValueOnce(Error('provider outage'));await expect(t.receipt(prepared.hash)).rejects.toThrow('provider outage');
});
import { encodeFunctionData, keccak256 } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
const relayer=privateKeyToAccount(`0x${'4'.repeat(64)}`);
async function signedJob(overrides:Record<string,unknown>={}, signer=relayer){
 const data=encodeFunctionData({abi,functionName:'recordMeet',args:[fixtureJob.offer,fixtureJob.acceptance,fixtureJob.posterSignature,fixtureJob.scannerSignature,fixtureJob.acceptedAt]});
 const rawTransaction=await signer.signTransaction({type:'eip1559',chainId:10143,to:fixtureJob.verifyingContract,data,value:0n,nonce:0,gas:500000n,maxFeePerGas:1000000000n,maxPriorityFeePerGas:1n,...overrides} as Parameters<typeof signer.signTransaction>[0]);
 return {...fixtureJob,rawTransaction,transactionHash:keccak256(rawTransaction)};
}
it('validates persisted signed transaction intent, sender, chain and bounded fees before recovery',async()=>{
 const c=clients();const t=createViemMeetTransport({publicClient:c.publicClient as unknown as PublicClient,walletClient:c.walletClient as unknown as WalletClient,account:relayer,abi,chainId:10143,verifyingContract:fixtureJob.verifyingContract});
 await expect(t.validateSigned(await signedJob())).resolves.toBeUndefined();
 for(const change of [{chainId:1},{to:'0x5555555555555555555555555555555555555555'},{value:1n},{data:'0x1234'},{gas:2000001n},{maxFeePerGas:500000000001n}])await expect(t.validateSigned(await signedJob(change))).rejects.toThrow();
 await expect(t.validateSigned(await signedJob({},privateKeyToAccount(`0x${'5'.repeat(64)}`)))).rejects.toThrow();
 const changed=await signedJob();changed.acceptedAt+=1n;await expect(t.validateSigned(changed)).rejects.toThrow();
 const wrongHash=await signedJob();wrongHash.transactionHash=`0x${'0'.repeat(64)}`;await expect(t.validateSigned(wrongHash)).rejects.toThrow();
});


it('rejects unsafe prepared fees before signing and validates the signer output',async()=>{
 const c=clients();c.walletClient.prepareTransactionRequest.mockImplementation(async(args:object)=>({...args,chainId:10143,nonce:0,gas:500000n,maxFeePerGas:1000000000n,maxPriorityFeePerGas:1000000001n}));
 await expect(c.t.prepare(fixtureJob)).rejects.toThrow('INVALID_SIGNED_TRANSACTION');expect(c.walletClient.signTransaction).not.toHaveBeenCalled();
 const valid=clients();valid.walletClient.signTransaction.mockResolvedValue((await signedJob({value:1n})).rawTransaction!);await expect(valid.t.prepare(fixtureJob)).rejects.toThrow('INVALID_SIGNED_TRANSACTION');
});
it('does not sign when the RPC cannot prepare transaction fees',async()=>{
 const c=clients();c.walletClient.prepareTransactionRequest.mockRejectedValue(new Error('fee estimate unavailable'));
 await expect(c.t.prepare(fixtureJob)).rejects.toThrow('fee estimate unavailable');expect(c.walletClient.signTransaction).not.toHaveBeenCalled();
});
it('rejects unsigned, malformed, legacy and incomplete saved transactions',async()=>{
 const {t}=clients();
 for(const job of [{...fixtureJob,rawTransaction:'0x010203' as Hex,transactionHash:keccak256('0x010203')},{...await signedJob(),transactionHash:null}])await expect(t.validateSigned(job)).rejects.toThrow('INVALID_SIGNED_TRANSACTION');
 const rawTransaction=await relayer.signTransaction({type:'legacy',chainId:10143,to:fixtureJob.verifyingContract,nonce:0,gas:500000n,gasPrice:1n,value:0n});await expect(t.validateSigned({...fixtureJob,rawTransaction,transactionHash:keccak256(rawTransaction)})).rejects.toThrow('INVALID_SIGNED_TRANSACTION');
});

it('accepts an RPC-estimated base-plus-tip budget above 100 gwei within the cap',async()=>{
 const c=clients();c.walletClient.prepareTransactionRequest.mockImplementation(async(args:object)=>({...args,chainId:10143,nonce:0,gas:500000n,maxFeePerGas:150000000000n,maxPriorityFeePerGas:3000000000n}));
 const prepared=await c.t.prepare(fixtureJob);await expect(c.t.validateSigned({...fixtureJob,rawTransaction:prepared.rawTransaction,transactionHash:prepared.hash})).resolves.toBeUndefined();
});
