import { vi } from 'vitest';
import { encodeAbiParameters, encodeEventTopics, parseAbi, type Hex } from 'viem';
import { uuidBytes32 } from '../../src/protocol/index.ts';
import type { mapCollection } from '../../src/events/map-collection.ts';

export function publicationFixture(eventId: string) {
  const address = '0x1111111111111111111111111111111111111111' as const;
  const hash = `0x${'ab'.repeat(32)}` as Hex;
  const blockHash = `0x${'cd'.repeat(32)}` as Hex;
  const event = uuidBytes32(eventId);
  const receipt = { status: 'success', transactionHash: hash, blockNumber: 10n, blockHash, logs: [{
    address, removed: false,
    topics: encodeEventTopics({ abi: parseAbi(['event CollectionCreated(uint256 indexed collectionId, bytes32 indexed eventId, uint256 cap, string metadataURI)']), eventName: 'CollectionCreated', args: { collectionId: 1n, eventId: event } }),
    data: encodeAbiParameters([{ type: 'uint256' }, { type: 'string' }], [50n, 'ipfs://public-event']),
  }] };
  const rpc = {
    getChainId: vi.fn(async () => 10143),
    getTransactionReceipt: vi.fn(async () => receipt),
    getBlock: vi.fn(async (params: { blockTag?: string; blockNumber?: bigint }) => ({ number: params.blockNumber ?? 11n, hash: blockHash })),
    readContract: vi.fn(async () => [event, 50n, 'ipfs://public-event']),
  };
  const input = { eventId, collectionId: '1', transactionHash: hash, displayName: 'Workshop frame', artworkUrl: 'https://example.com/public-frame.png', claimStartsAt: '2026-10-24T01:00:00.000Z', claimEndsAt: '2026-10-25T01:00:00.000Z' };
  return { input, receipt, rpc, client: rpc as unknown as NonNullable<Parameters<typeof mapCollection>[3]>, config: { rpcUrl: 'https://rpc.invalid', contractAddress: address, chainId: 10143 as const } };
}
