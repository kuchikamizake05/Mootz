import type { Address, Hex } from "viem";

export const DEFAULT_COLLECTION_ID = 1n;
const ZERO_BYTES32 = `0x${"0".repeat(64)}`;

/** Accepts a positive integer string; anything else (or missing) is invalid, except undefined → default. */
export function parseCollectionId(raw: string | string[] | undefined): bigint | null {
  if (raw === undefined) return DEFAULT_COLLECTION_ID;
  if (typeof raw !== "string" || !/^[1-9]\d{0,17}$/.test(raw)) return null;
  return BigInt(raw);
}

export function buildChallenge(address: Address, nonce: string, issued: Date): string {
  return `Demo Gathering B wants to confirm you control ${address}.\nNonce: ${nonce}\nIssued: ${issued.toISOString()}`;
}

/** 16 random bytes, hex. Callers must request a new one for every attempt. */
export function newNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export type Recognition =
  | { kind: "alumni"; balance: bigint; meetCount: bigint; eventId: Hex }
  | { kind: "nonholder"; meetCount: bigint; eventId: Hex }
  | { kind: "missing-collection" };

/** Only successful reads reach here; read failures are errors and never become "nonholder". */
export function classify(eventId: Hex, balance: bigint, meetCount: bigint): Recognition {
  if (eventId.toLowerCase() === ZERO_BYTES32) return { kind: "missing-collection" };
  return balance > 0n ? { kind: "alumni", balance, meetCount, eventId } : { kind: "nonholder", meetCount, eventId };
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** EIP-1193 user rejection (4001) or ethers/viem-style ACTION_REJECTED. */
export function isUserRejection(error: unknown): boolean {
  const e = error as { code?: unknown; name?: string; cause?: { code?: unknown } } | null;
  return e?.code === 4001 || e?.cause?.code === 4001 || e?.name === "UserRejectedRequestError";
}
