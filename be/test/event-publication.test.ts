import { expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { mapCollection } from '../src/events/map-collection.ts';
import { publicationFixture } from './support/collection-publication.ts';

it.each(['invalid-input', 'wrong-chain', 'failed', 'unfinalized', 'reorg', 'wrong-contract', 'wrong-event', 'readback', 'rpc'] as const)('does not map a collection on %s evidence', async failure => {
  const f = publicationFixture('00000000-0000-4000-8000-000000000001');
  const connect = vi.fn(); const pool = { connect } as unknown as Pool;
  if (failure === 'invalid-input') f.input.claimEndsAt = f.input.claimStartsAt;
  if (failure === 'wrong-chain') f.rpc.getChainId.mockResolvedValue(1);
  if (failure === 'failed') f.receipt.status = 'reverted';
  if (failure === 'unfinalized') f.rpc.getBlock.mockResolvedValue({ number: 9n, hash: f.receipt.blockHash });
  if (failure === 'reorg') f.rpc.getBlock.mockResolvedValue({ number: 11n, hash: `0x${'ef'.repeat(32)}` });
  if (failure === 'wrong-contract') f.receipt.logs[0]!.address = '0x2222222222222222222222222222222222222222' as typeof f.config.contractAddress;
  if (failure === 'wrong-event') f.input.eventId = '00000000-0000-4000-8000-000000000002';
  if (failure === 'readback') f.rpc.readContract.mockResolvedValue(['0x00', 50n, 'ipfs://public-event']);
  if (failure === 'rpc') f.rpc.getBlock.mockRejectedValue(Error('Provider unavailable'));
  await expect(mapCollection(pool, f.input, f.config, f.client)).rejects.toThrow();
  expect(connect).not.toHaveBeenCalled();
});
