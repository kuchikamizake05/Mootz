import { TransactionReceiptNotFoundError, parseAbiItem, type Address, type PublicClient } from 'viem';
import type { ChainReadAdapter, ChainReceipt } from './types.js';
const fail = () => new Error('Chain sync provider unavailable');
const eventAbi = {
  MeetRecorded: parseAbiItem('event MeetRecorded(bytes32 indexed meetId,address indexed poster,address indexed scanner,uint256 acceptedAt,bytes32 eventId,bytes32 photoCommitment)'),
  CollectionCreated: parseAbiItem('event CollectionCreated(uint256 indexed collectionId,bytes32 indexed eventId,uint256 cap,string metadataURI)'),
  CollectionClaimed: parseAbiItem('event CollectionClaimed(uint256 indexed collectionId,address indexed recipient,address indexed issuer)')
};
export function createViemChainReadAdapter(client: PublicClient, addresses: readonly Address[], chainId = 10143): ChainReadAdapter {
  const ensureChain=async()=>{try{if(await client.getChainId()!==chainId || ![143,10143].includes(chainId))throw fail();}catch{throw fail();}};
  return {
    async getHead() { try { await ensureChain(); return await client.getBlockNumber(); } catch { throw fail(); } },
    async getFinalizedBlock() { await ensureChain();try { const b=await client.getBlock({blockTag:'finalized'}); return typeof b.number==='bigint'&&b.number>=0n&&/^0x[0-9a-f]{64}$/i.test(b.hash??'')?{number:b.number,hash:b.hash!}:null; } catch { return null; } },
    async getBlock(number) { await ensureChain();try { const b=await client.getBlock({blockNumber:number}); return b.number===number&&b.number>=0n&&/^0x[0-9a-f]{64}$/i.test(b.hash??'')?{number:b.number,hash:b.hash!}:null; } catch { return null; } },
    async getLogs({address,fromBlock,toBlock,eventName}) {
      if(!addresses.some(a=>a.toLowerCase()===address.toLowerCase())) throw fail();
      try {
        await ensureChain();
        return await client.getLogs({address,fromBlock,toBlock,event:eventAbi[eventName]}) as unknown as Awaited<ReturnType<ChainReadAdapter['getLogs']>>;
      } catch { throw fail(); }
    },
    async getReceipt(hash) {
      try {
        await ensureChain();
        const r=await client.getTransactionReceipt({hash});
        return {transactionHash:r.transactionHash,status:r.status,blockNumber:r.blockNumber,blockHash:r.blockHash,to:r.to,from:r.from,logs:r.logs} as unknown as ChainReceipt;
      } catch(error) { if(error instanceof TransactionReceiptNotFoundError) return null; throw fail(); }
    }
  };
}
