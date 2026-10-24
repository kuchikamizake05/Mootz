import { createPublicClient, decodeEventLog, http, parseAbi, type Address, type Hex, type PublicClient } from 'viem';
import type { Pool } from 'pg';
import { uuidBytes32 } from '../protocol/index.ts';

const abi = parseAbi([
  'event CollectionCreated(uint256 indexed collectionId, bytes32 indexed eventId, uint256 cap, string metadataURI)',
  'function collections(uint256) view returns (bytes32 eventId, uint256 cap, string metadataURI)',
]);
type Config = { rpcUrl: string; contractAddress: Address; chainId: 10143 };
type Client = Pick<PublicClient, 'getChainId' | 'getTransactionReceipt' | 'getBlock' | 'readContract'>;
type Input = { eventId: string; collectionId: string; transactionHash: Hex; displayName: string; artworkUrl: string; claimStartsAt: string; claimEndsAt: string };

function parseInput(raw: unknown): Input {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('Expected mapping');
  const input = raw as Record<string, unknown>;
  const keys = ['eventId', 'collectionId', 'transactionHash', 'displayName', 'artworkUrl', 'claimStartsAt', 'claimEndsAt'];
  if (Object.keys(input).length !== keys.length || keys.some(key => typeof input[key] !== 'string')) throw Error('Expected mapping fields');
  const value = input as Input;
  uuidBytes32(value.eventId);
  if (!/^[1-9][0-9]{0,77}$/.test(value.collectionId) || BigInt(value.collectionId) >= 1n << 256n || !/^0x[0-9a-f]{64}$/i.test(value.transactionHash)) throw Error('Invalid chain identifiers');
  const url = new URL(value.artworkUrl);
  if (url.protocol !== 'https:' || url.username || url.password || /\s/.test(value.artworkUrl) || !value.displayName.trim() || value.displayName.length > 200) throw Error('Expected public artwork/name');
  const starts = new Date(value.claimStartsAt); const ends = new Date(value.claimEndsAt);
  if (!Number.isFinite(starts.getTime()) || !Number.isFinite(ends.getTime()) || ends <= starts || starts.toISOString() !== value.claimStartsAt || ends.toISOString() !== value.claimEndsAt) throw Error('Expected canonical UTC claim window');
  return { ...value, eventId: value.eventId.toLowerCase(), transactionHash: value.transactionHash.toLowerCase() as Hex, displayName: value.displayName.trim() };
}

/** Read-only onchain verification followed by an operator-authorized, idempotent DB mapping. */
export async function mapCollection(pool: Pool, raw: unknown, config: Config, client?: Client): Promise<void> {
  const input = parseInput(raw);
  const rpc = client ?? createPublicClient({ transport: http(config.rpcUrl, { timeout: 5000, retryCount: 1 }) });
  if (config.chainId !== 10143 || await rpc.getChainId() !== config.chainId) throw Error('Wrong chain');
  const receipt = await rpc.getTransactionReceipt({ hash: input.transactionHash });
  if (receipt.status !== 'success' || receipt.transactionHash.toLowerCase() !== input.transactionHash) throw Error('Creation transaction did not succeed');
  const [finalized, canonical] = await Promise.all([
    rpc.getBlock({ blockTag: 'finalized' }), rpc.getBlock({ blockNumber: receipt.blockNumber }),
  ]);
  if (receipt.blockNumber < 0n || finalized.number === null || !finalized.hash || finalized.number < receipt.blockNumber || canonical.number !== receipt.blockNumber || canonical.hash?.toLowerCase() !== receipt.blockHash.toLowerCase()) throw Error('Creation transaction is not canonically finalized');
  const creation = receipt.logs.flatMap(log => {
    if (log.address.toLowerCase() !== config.contractAddress.toLowerCase() || log.removed) return [];
    try { return [decodeEventLog({ abi, eventName: 'CollectionCreated', data: log.data, topics: log.topics }).args]; } catch { return []; }
  }).find(log => log.collectionId === BigInt(input.collectionId) && log.eventId.toLowerCase() === uuidBytes32(input.eventId));
  if (!creation || creation.cap <= 0n || !creation.metadataURI) throw Error('Matching collection creation is required');
  const stored = await rpc.readContract({ address: config.contractAddress, abi, functionName: 'collections', args: [BigInt(input.collectionId)], blockNumber: finalized.number });
  if (!Array.isArray(stored) || stored[0]?.toLowerCase() !== creation.eventId.toLowerCase() || stored[1] !== creation.cap || stored[2] !== creation.metadataURI) throw Error('Collection readback differs');

  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    // Lock the event so two operators cannot register conflicting mappings concurrently.
    if (!(await db.query('SELECT id FROM events WHERE id=$1 FOR UPDATE', [input.eventId])).rowCount) throw Error('Event not found');
    const values = [input.eventId, config.chainId, config.contractAddress.toLowerCase(), input.collectionId, input.claimStartsAt, input.claimEndsAt, input.displayName, input.artworkUrl, input.transactionHash, receipt.blockHash.toLowerCase(), receipt.blockNumber.toString()];
    await db.query(`INSERT INTO event_collections(event_id,chain_id,contract_address,collection_id,claim_starts_at,claim_ends_at,display_name,artwork_url,creation_transaction_hash,creation_block_hash,creation_block_number)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT(event_id) DO NOTHING`, values);
    const match = await db.query(`SELECT 1 FROM event_collections WHERE event_id=$1 AND chain_id=$2 AND contract_address=$3 AND collection_id=$4
      AND claim_starts_at=$5 AND claim_ends_at=$6 AND display_name=$7 AND artwork_url=$8 AND creation_transaction_hash=$9 AND creation_block_hash=$10 AND creation_block_number=$11`, values);
    if (!match.rowCount) throw Error('Existing collection mapping differs; no overwrite allowed');
    await db.query('COMMIT');
  } catch (error) { await db.query('ROLLBACK'); throw error; } finally { db.release(); }
}
