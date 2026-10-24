import type { Pool } from 'pg';
import { keccak256, parseTransaction, recoverTransactionAddress, type Address, type Hex, type TransactionSerialized } from 'viem';

type QueueName = 'meet' | 'claim';
type RelayRow = {
  queue: QueueName;
  id: string;
  created_at: Date;
  expires_at: Date;
  attempts: number;
  last_error: string | null;
  completed_at: Date | null;
  raw_transaction: Hex | null;
  transaction_hash: Hex | null;
  relayer_address?: Address | null;
};

export interface RelayInspectionReader {
  accountState(address: Address): Promise<{ latestNonce: number; pendingNonce: number; finalizedNonce: number | null; balanceWei: bigint }>;
  receipt(hash: Hex): Promise<'pending' | 'success' | 'reverted' | 'unavailable'>;
}

const knownErrors = new Set([
  'DEPENDENCY_RETRY', 'INVALID_SIGNED_PAYLOAD', 'INVALID_SIGNED_TRANSACTION', 'RELAY_DEADLINE',
  'NONCE_UNRESOLVED', 'WAITING_RECEIPT', 'READBACK_PENDING', 'RECORD_MISMATCH',
  'TRANSACTION_REVERTED', 'HASH_MISMATCH', 'INVALID_PAYLOAD', 'CLAIM_EXPIRED',
]);

function safeError(value: string | null): string | null {
  return value && knownErrors.has(value) ? value : value ? 'OTHER_RETRY' : null;
}

function safeAge(date: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
}

export async function inspectRelayState(
  pool: Pool,
  reader: RelayInspectionReader,
  relayerAddress: Address,
  options: { now?: Date; limit?: number } = {},
) {
  const now = options.now ?? new Date();
  const limit = options.limit ?? 20;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('Invalid inspection bounds');
  const [meet, claims, account] = await Promise.all([
    pool.query<RelayRow>(`SELECT 'meet'::text AS queue,o.meet_id AS id,m.accepted_at AS created_at,m.accepted_at+interval '300 seconds' AS expires_at,o.attempts,o.last_error,o.completed_at,o.raw_transaction,o.transaction_hash
      FROM meet_outbox o JOIN meets m ON m.id=o.meet_id WHERE o.completed_at IS NULL
      ORDER BY (o.raw_transaction IS NOT NULL) DESC,o.next_attempt_at,o.meet_id LIMIT $1`, [limit + 1]),
    pool.query<RelayRow>(`SELECT 'claim'::text AS queue,o.id,o.created_at,to_timestamp((o.claim->>'deadline')::bigint) AS expires_at,o.attempts,o.last_error,o.completed_at,o.raw_transaction,o.transaction_hash,o.relayer_address
      FROM claim_outbox o WHERE o.completed_at IS NULL
      ORDER BY (o.raw_transaction IS NOT NULL) DESC,o.next_attempt_at,o.id LIMIT $1`, [limit + 1]),
    reader.accountState(relayerAddress),
  ]);
  const jobs = [...meet.rows, ...claims.rows]
    .sort((a, b) => Number(b.raw_transaction !== null) - Number(a.raw_transaction !== null) || a.created_at.getTime() - b.created_at.getTime())
    .slice(0, limit);
  const unresolved = jobs.filter(job => job.raw_transaction !== null);
  const diagnostics = await Promise.all(unresolved.map(async job => {
    let nonce: number | null = null;
    let senderMatches = false;
    let signedPayload = 'unreadable';
    try {
      const tx = parseTransaction(job.raw_transaction!);
      nonce = tx.nonce ?? null;
      const sender = await recoverTransactionAddress({ serializedTransaction: job.raw_transaction! as TransactionSerialized });
      senderMatches = sender.toLowerCase() === relayerAddress.toLowerCase() && (!job.relayer_address || sender.toLowerCase() === job.relayer_address.toLowerCase());
      signedPayload = senderMatches && nonce !== null && job.transaction_hash && keccak256(job.raw_transaction!).toLowerCase() === job.transaction_hash.toLowerCase() ? 'sender_hash_and_nonce_match' : 'sender_or_hash_mismatch';
    } catch { /* Keep corrupt persisted bytes pending and report only a bounded category. */ }
    const receipt = job.transaction_hash ? await reader.receipt(job.transaction_hash).catch(() => 'unavailable' as const) : 'unavailable';
    const consumed = nonce !== null && account.finalizedNonce !== null ? nonce < account.finalizedNonce : null;
    let assessment: string;
    if (signedPayload !== 'sender_hash_and_nonce_match') assessment = 'preserve_job_and_escalate_signed_payload';
    else if (receipt === 'success') assessment = 'receipt_success_requires_application_readback';
    else if (receipt === 'reverted') assessment = 'receipt_reverted_requires_operator_review';
    else if (consumed === true) assessment = 'nonce_consumed_without_known_receipt_possible_external_conflict';
    else if (job.expires_at.getTime() <= now.getTime()) assessment = 'expired_signed_job_preserve_and_escalate_no_rebroadcast';
    else if (receipt === 'pending') assessment = 'retry_exact_saved_bytes_after_worker_validation';
    else if (consumed === false) assessment = 'nonce_not_finalized_retry_exact_saved_bytes_after_worker_validation';
    else assessment = 'finalized_nonce_unavailable_preserve_and_review_before_rebroadcast';
    return {
      queue: job.queue,
      jobId: job.id,
      ageSeconds: safeAge(job.created_at, now),
      expired: job.expires_at.getTime() <= now.getTime(),
      attempts: job.attempts,
      lastError: safeError(job.last_error),
      nonce,
      transactionHash: job.transaction_hash,
      receipt,
      finalizedNonceHasPassedTransaction: consumed,
      signedPayload,
      assessment,
    };
  }));
  const activeUnsigned = jobs.filter(job => job.raw_transaction === null).length;
  const meetHasMore = meet.rows.length > limit;
  const claimHasMore = claims.rows.length > limit;
  return {
    mode: 'read_only' as const,
    relayer: {
      configured: true,
      latestNonce: account.latestNonce,
      pendingNonce: account.pendingNonce,
      finalizedNonce: account.finalizedNonce,
      balanceWei: account.balanceWei.toString(),
    },
    queues: {
      meetActiveShown: Math.min(meet.rows.length, limit),
      claimActiveShown: Math.min(claims.rows.length, limit),
      unresolvedSignedShown: unresolved.length,
      activeUnsignedShown: activeUnsigned,
      truncated: meetHasMore || claimHasMore || meet.rows.length + claims.rows.length > limit,
    },
    unresolved: diagnostics,
    guidance: unresolved.length ? 'Do not clear or replace a signed job. A pending receipt may be retried with exact saved bytes only while the job is unexpired and the finalized account nonce has not passed it, after normal worker validation. Expired jobs keep the nonce reserved and are not rebroadcast. Treat a finalized nonce that passed the saved nonce with no known receipt as a possible external sender or replacement conflict; identify the consuming transaction before any separately authorized replacement or cancellation.' : 'No unresolved signed transaction was found in the bounded queue snapshot. An unsigned retry may still be blocked by an active signed job outside this snapshot.',
  };
}
