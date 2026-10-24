const GWEI = 1_000_000_000n;
const MAX_FEE_GWEI = 1_000n;
const MAX_PRIORITY_FEE_GWEI = 100n;

export type FeePolicy = {
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
};

export const DEFAULT_FEE_POLICY: FeePolicy = {
  maxFeePerGas: 500n * GWEI,
  maxPriorityFeePerGas: 50n * GWEI,
};

/**
 * Read separately bounded fee ceilings. RPC estimates remain the transaction's
 * fee values; these limits only reject estimates and saved transactions above
 * the operator-approved budget.
 */
export function loadFeePolicy(env: NodeJS.ProcessEnv, prefix: string): FeePolicy {
  const maxFeePerGas = readGwei(env[`${prefix}_MAX_FEE_GWEI`], 500n, MAX_FEE_GWEI, `${prefix}_MAX_FEE_GWEI`);
  const maxPriorityFeePerGas = readGwei(env[`${prefix}_MAX_PRIORITY_FEE_GWEI`], 50n, MAX_PRIORITY_FEE_GWEI, `${prefix}_MAX_PRIORITY_FEE_GWEI`);
  if (maxPriorityFeePerGas > maxFeePerGas) throw new Error(`${prefix}_MAX_PRIORITY_FEE_GWEI exceeds max fee`);
  return { maxFeePerGas: maxFeePerGas * GWEI, maxPriorityFeePerGas: maxPriorityFeePerGas * GWEI };
}

function readGwei(value: string | undefined, fallback: bigint, hardMaximum: bigint, name: string): bigint {
  if (value === undefined || value === '') return fallback;
  if (!/^\d+$/.test(value)) throw new Error(`${name} must be a whole number of gwei`);
  const parsed = BigInt(value);
  if (parsed < 1n || parsed > hardMaximum) throw new Error(`${name} must be between 1 and ${hardMaximum} gwei`);
  return parsed;
}

export function isWithinFeePolicy(tx: { maxFeePerGas?: bigint | undefined; maxPriorityFeePerGas?: bigint | undefined }, policy: FeePolicy): boolean {
  return tx.maxFeePerGas !== undefined
    && tx.maxFeePerGas > 0n
    && tx.maxFeePerGas <= policy.maxFeePerGas
    && tx.maxPriorityFeePerGas !== undefined
    && tx.maxPriorityFeePerGas >= 0n
    && tx.maxPriorityFeePerGas <= policy.maxPriorityFeePerGas
    && tx.maxPriorityFeePerGas <= tx.maxFeePerGas;
}
