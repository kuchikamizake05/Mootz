import { describe, expect, it } from 'vitest';
import { DEFAULT_FEE_POLICY, isWithinFeePolicy, loadFeePolicy } from '../src/chain/fees.ts';

describe('relay fee policy', () => {
  it('uses a bounded default above the old 100 gwei ceiling', () => {
    expect(DEFAULT_FEE_POLICY).toEqual({ maxFeePerGas: 500_000_000_000n, maxPriorityFeePerGas: 50_000_000_000n });
    expect(loadFeePolicy({}, 'MEET_RELAY')).toEqual(DEFAULT_FEE_POLICY);
  });

  it('accepts bounded operator overrides and applies separate total and priority caps', () => {
    const policy = loadFeePolicy({ MEET_RELAY_MAX_FEE_GWEI: '300', MEET_RELAY_MAX_PRIORITY_FEE_GWEI: '25' }, 'MEET_RELAY');
    expect(isWithinFeePolicy({ maxFeePerGas: 200_000_000_000n, maxPriorityFeePerGas: 20_000_000_000n }, policy)).toBe(true);
    expect(isWithinFeePolicy({ maxFeePerGas: 200_000_000_000n, maxPriorityFeePerGas: 26_000_000_000n }, policy)).toBe(false);
    expect(isWithinFeePolicy({ maxFeePerGas: 301_000_000_000n, maxPriorityFeePerGas: 1n }, policy)).toBe(false);
  });

  it.each([
    { MEET_RELAY_MAX_FEE_GWEI: '1001' },
    { MEET_RELAY_MAX_PRIORITY_FEE_GWEI: '101' },
    { MEET_RELAY_MAX_FEE_GWEI: '10', MEET_RELAY_MAX_PRIORITY_FEE_GWEI: '11' },
    { MEET_RELAY_MAX_FEE_GWEI: '1.5' },
    { MEET_RELAY_MAX_FEE_GWEI: '0' },
  ])('rejects invalid or unbounded operator values: %o', (env) => {
    expect(() => loadFeePolicy(env, 'MEET_RELAY')).toThrow();
  });
});
