import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { Pool } from 'pg';
import { encodeAbiParameters, encodeEventTopics, parseAbi, type Address, type Hex } from 'viem';
import { migrate } from '../src/db/migrate.ts';
import { runChainIndexer } from '../src/chain-sync/index.ts';
import type { ChainLog, ChainReadAdapter } from '../src/chain-sync/types.ts';

const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
const address = '0xc1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1' as Address;
const hash = `0x${'a'.repeat(64)}` as Hex;
const txHash = `0x${'b'.repeat(64)}` as Hex;
const abi = parseAbi(['event CollectionCreated(uint256 indexed collectionId,bytes32 indexed eventId,uint256 cap,string metadataURI)']);
const config = [{ address, startBlock: 0n, streams: ['CollectionCreated'] as const }];
function log(blockNumber = 1n): ChainLog {
  return {
    address, transactionHash: txHash, blockHash: hash, blockNumber, logIndex: 0,
    topics: encodeEventTopics({ abi, eventName: 'CollectionCreated', args: { collectionId: 1n, eventId: hash } }) as [Hex, ...Hex[]],
    data: encodeAbiParameters([{ type: 'uint256' }, { type: 'string' }], [10n, 'https://example.com/public-artwork.json']),
  };
}
function adapter(overrides: Partial<ChainReadAdapter> = {}): ChainReadAdapter {
  return {
    getHead: async () => 10n,
    getFinalizedBlock: async () => ({ number: 10n, hash }),
    getBlock: async number => ({ number, hash }),
    getLogs: async () => [], getReceipt: async () => null,
    ...overrides,
  };
}
async function reset() {
  await pool.query('DELETE FROM chain_sync_events WHERE contract_address=$1', [address]);
  await pool.query('DELETE FROM chain_sync_cursors WHERE contract_address=$1', [address]);
}
async function cursor() {
  return (await pool.query('SELECT next_block FROM chain_sync_cursors WHERE contract_address=$1', [address])).rows[0]?.next_block;
}
beforeAll(async () => { await migrate(pool); await reset(); });
afterAll(async () => { await reset(); await pool.end(); });

it('shrinks provider-limited ranges and resumes a bounded backfill after restart', async () => {
  await reset();
  const getLogs = vi.fn(async ({ fromBlock, toBlock }: { fromBlock: bigint; toBlock: bigint }) => {
    if (toBlock - fromBlock + 1n > 2n) throw Error('provider range limit');
    return [];
  });
  const rpc = adapter({ getLogs });
  expect((await runChainIndexer(pool, rpc, config, { initialChunk: 8, maxRanges: 2 })).ranges).toBe(2);
  expect(await cursor()).toBe('4');
  expect(getLogs.mock.calls.some(([range]) => range.toBlock - range.fromBlock > 1n)).toBe(true);
  await runChainIndexer(pool, rpc, config, { initialChunk: 2, maxRanges: 5 });
  expect(await cursor()).toBe('11');
});

it('deduplicates repeated logs and retains only public decoded fields', async () => {
  await reset();
  const entry = log();
  const rpc = adapter({ getLogs: async () => [entry, entry] });
  await runChainIndexer(pool, rpc, config);
  const rows = (await pool.query('SELECT payload FROM chain_sync_events WHERE contract_address=$1', [address])).rows;
  expect(rows).toHaveLength(1);
  expect(rows[0].payload).toEqual({ collectionId: '1', eventId: hash, cap: '10', metadataURI: 'https://example.com/public-artwork.json' });
  expect(await cursor()).toBe('11');
});

it('rolls back events when advancing their cursor fails', async () => {
  await reset();
  const failingPool = {
    query: pool.query.bind(pool),
    async connect() {
      const client = await pool.connect();
      return {
        query: async (sql: string, args?: unknown[]) => {
          if (sql.startsWith('UPDATE chain_sync_cursors')) throw Error('synthetic cursor storage failure');
          return client.query(sql, args);
        },
        release: () => client.release(),
      };
    },
  } as unknown as Pool;
  await expect(runChainIndexer(failingPool, adapter({ getLogs: async () => [log()] }), config)).rejects.toThrow('synthetic cursor storage failure');
  expect(await cursor()).toBe('0');
  expect((await pool.query('SELECT 1 FROM chain_sync_events WHERE contract_address=$1', [address])).rowCount).toBe(0);
});

it('does no indexing when finality is unavailable or another indexer holds the lock', async () => {
  await reset();
  expect((await runChainIndexer(pool, adapter({ getFinalizedBlock: async () => null }), config)).ranges).toBe(0);
  expect(await cursor()).toBeUndefined();
  const held = await pool.connect();
  await held.query('SELECT pg_advisory_lock(729610144)');
  try {
    const getLogs = vi.fn(async () => []);
    expect((await runChainIndexer(pool, adapter({ getLogs }), config)).ranges).toBe(0);
    expect(getLogs).not.toHaveBeenCalled();
    expect(await cursor()).toBeUndefined();
  } finally { await held.query('SELECT pg_advisory_unlock(729610144)'); held.release(); }
});

it('preserves the cursor on malformed/out-of-range logs and irreducible provider errors', async () => {
  await reset();
  for (const entry of [{ ...log(), blockNumber: 100n }, { ...log(), data: '0x1234' as Hex }]) {
    await expect(runChainIndexer(pool, adapter({ getLogs: async () => [entry] }), config)).rejects.toThrow();
    expect(await cursor()).toBe('0');
  }
  await expect(runChainIndexer(pool, adapter({ getLogs: async () => { throw Error('synthetic outage'); } }), config, { initialChunk: 1 })).rejects.toThrow('synthetic outage');
  expect(await cursor()).toBe('0');
});

it('rejects incomplete receipt and finalized evidence at the database boundary', async () => {
  const id = crypto.randomUUID();
  try {
    await expect(pool.query("INSERT INTO chain_receipt_observations(source,job_id,chain_id,contract_address,transaction_hash,observed_status,receipt_block_number) VALUES('claim',$1,10143,$2,$3,'success',20)", [id, address, txHash])).rejects.toThrow();
    await expect(pool.query("INSERT INTO chain_receipt_observations(source,job_id,chain_id,contract_address,transaction_hash,observed_status,receipt_block_number,receipt_block_hash,canonical_block_hash,finalized_at) VALUES('claim',$1,10143,$2,$3,'success',20,$4,$4,now())", [id, address, txHash, hash])).rejects.toThrow();
  } finally { await pool.query("DELETE FROM chain_receipt_observations WHERE source='claim' AND job_id=$1", [id]); }
});
