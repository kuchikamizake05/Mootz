import type { Address, Hex } from 'viem';

export type IndexedEventName = 'MeetRecorded' | 'CollectionCreated' | 'CollectionClaimed';
export interface ChainLog {
  address: Address; transactionHash: Hex; logIndex: number; blockNumber: bigint; blockHash: Hex;
  data: Hex; topics: readonly Hex[];
}
export interface ChainBlock { number: bigint; hash: Hex }
export interface ChainReceipt {
  transactionHash: Hex; status: 'success' | 'reverted'; blockNumber: bigint; blockHash: Hex;
  to: Address | null; from: Address; logs: readonly ChainLog[];
}
export interface ChainReadAdapter {
  getHead(): Promise<bigint>;
  getFinalizedBlock(): Promise<ChainBlock | null>;
  getBlock(number: bigint): Promise<ChainBlock | null>;
  getLogs(input: { address: Address; fromBlock: bigint; toBlock: bigint; eventName: IndexedEventName }): Promise<readonly ChainLog[]>;
  getReceipt(hash: Hex): Promise<ChainReceipt | null>;
}
export interface IndexContract { address: Address; startBlock: bigint; streams: readonly IndexedEventName[] }
