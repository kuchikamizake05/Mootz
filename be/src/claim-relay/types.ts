import type { Address, Hex } from 'viem';
import type { Claim } from '../protocol/index.js';

export interface ClaimJob {
  id: string;
  authorizationId: string;
  accountId: string;
  eventId: string;
  chainId: number;
  verifyingContract: Address;
  claim: Claim;
  signature: Hex;
  attempts: number;
  rawTransaction: Hex | null;
  transactionHash: Hex | null;
  relayerAddress: Address | null;
}
export interface ClaimState {
  eventId: Hex;
  cap: bigint;
  totalSupply: bigint;
  balance: bigint;
  claimed: boolean;
  nonceUsed: boolean;
  issuerAuthorized: boolean;
}
export interface ClaimTransport {
  read(job: ClaimJob): Promise<ClaimState>;
  prepare(job: ClaimJob): Promise<{ hash: Hex; rawTransaction: Hex; sender: Address }>;
  validateSigned(job: ClaimJob): Promise<void>;
  broadcast(raw: Hex): Promise<Hex>;
  receipt(job: ClaimJob): Promise<'pending' | 'reverted' | 'matched' | 'mismatched'>;
}
