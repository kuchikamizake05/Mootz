import { describe, expect, it } from 'vitest';
import { keccak256 } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type { Pool } from 'pg';
import { inspectRelayState } from '../src/relay/inspect.js';

const account = privateKeyToAccount(`0x${'0'.repeat(63)}1`);
const now = new Date('2026-10-24T00:00:00.000Z');

function poolWith(rows: { meet?: unknown[]; claim?: unknown[] }): Pool {
  return { query: async (sql: string) => ({ rows: sql.includes("'meet'") ? rows.meet ?? [] : rows.claim ?? [] }) } as unknown as Pool;
}

describe('inspectRelayState', () => {
  it('reports a finalized nonce conflict as a possibility and never returns signed bytes', async () => {
    const raw = await account.signTransaction({
      chainId: 10143, type: 'eip1559', nonce: 3, to: '0x0000000000000000000000000000000000000001',
      gas: 21000n, maxFeePerGas: 2n, maxPriorityFeePerGas: 1n, value: 0n,
    });
    const row = { queue: 'meet', id: 'meet-id', created_at: new Date(now.getTime() - 90_000), expires_at: new Date(now.getTime() - 1000), attempts: 8, last_error: 'DEPENDENCY_RETRY', completed_at: null, raw_transaction: raw, transaction_hash: keccak256(raw) };
    const report = await inspectRelayState(poolWith({ meet: [row] }), {
      async accountState() { return { latestNonce: 5, pendingNonce: 5, finalizedNonce: 5, balanceWei: 123n }; },
      async receipt() { return 'pending'; },
    }, account.address, { now });
    expect(report.unresolved[0]).toMatchObject({ queue: 'meet', jobId: 'meet-id', nonce: 3, expired: true, receipt: 'pending', finalizedNonceHasPassedTransaction: true, assessment: 'nonce_consumed_without_known_receipt_possible_external_conflict' });
    expect(JSON.stringify(report)).not.toContain(raw);
    expect(report.unresolved[0]?.lastError).toBe('DEPENDENCY_RETRY');
    expect(JSON.stringify(report)).not.toContain('privateKey');
  });

  it('recommends exact-byte retry when the saved transaction is still pending', async () => {
    const raw = await account.signTransaction({
      chainId: 10143, type: 'eip1559', nonce: 1, to: '0x0000000000000000000000000000000000000001',
      gas: 21000n, maxFeePerGas: 2n, maxPriorityFeePerGas: 1n, value: 0n,
    });
    const row = { queue: 'claim', id: 'claim-id', created_at: now, expires_at: new Date(now.getTime() + 60_000), attempts: 2, last_error: 'UNTRUSTED RPC MESSAGE', completed_at: null, raw_transaction: raw, transaction_hash: keccak256(raw), relayer_address: account.address };
    const report = await inspectRelayState(poolWith({ claim: [row] }), {
      async accountState() { return { latestNonce: 1, pendingNonce: 2, finalizedNonce: 1, balanceWei: 0n }; },
      async receipt() { return 'pending'; },
    }, account.address, { now });
    expect(report.unresolved[0]).toMatchObject({ queue: 'claim', nonce: 1, expired: false, finalizedNonceHasPassedTransaction: false, receipt: 'pending', lastError: 'OTHER_RETRY', assessment: 'retry_exact_saved_bytes_after_worker_validation' });
    expect(JSON.stringify(report)).not.toContain('UNTRUSTED RPC MESSAGE');
  });

  it('preserves an expired signed job even when the receipt lookup says pending', async () => {
    const raw = await account.signTransaction({
      chainId: 10143, type: 'eip1559', nonce: 1, to: '0x0000000000000000000000000000000000000001',
      gas: 21000n, maxFeePerGas: 2n, maxPriorityFeePerGas: 1n, value: 0n,
    });
    const row = { queue: 'meet', id: 'expired-job', created_at: now, expires_at: new Date(now.getTime() - 1000), attempts: 4, last_error: null, completed_at: null, raw_transaction: raw, transaction_hash: keccak256(raw) };
    const report = await inspectRelayState(poolWith({ meet: [row] }), {
      async accountState() { return { latestNonce: 1, pendingNonce: 2, finalizedNonce: 1, balanceWei: 0n }; },
      async receipt() { return 'pending'; },
    }, account.address, { now });
    expect(report.unresolved[0]).toMatchObject({ expired: true, receipt: 'pending', assessment: 'expired_signed_job_preserve_and_escalate_no_rebroadcast' });
  });

  it('rejects unbounded queue snapshots', async () => {
    await expect(inspectRelayState(poolWith({}), {
      async accountState() { return { latestNonce: 0, pendingNonce: 0, finalizedNonce: 0, balanceWei: 0n }; },
      async receipt() { return 'pending'; },
    }, account.address, { limit: 101 })).rejects.toThrow('Invalid inspection bounds');
  });

  it('marks a per-queue snapshot truncated when rows exceed its display limit', async () => {
    const rows = [0, 1].map(index => ({ queue: 'meet', id: `meet-${index}`, created_at: now, expires_at: new Date(now.getTime() + 60_000), attempts: 0, last_error: null, completed_at: null, raw_transaction: null, transaction_hash: null }));
    const report = await inspectRelayState(poolWith({ meet: rows }), {
      async accountState() { return { latestNonce: 0, pendingNonce: 0, finalizedNonce: 0, balanceWei: 0n }; },
      async receipt() { return 'pending'; },
    }, account.address, { now, limit: 1 });
    expect(report.queues).toMatchObject({ meetActiveShown: 1, claimActiveShown: 0, activeUnsignedShown: 1, truncated: true });
  });
});
