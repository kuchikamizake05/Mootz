import { encodeAbiParameters, keccak256, hashTypedData, recoverTypedDataAddress, isAddress, type Hex, type Address } from 'viem';
import { meetTypes, claimTypes, RECORD_MEET, OFFCHAIN_MEET, type MeetOffer, type MeetAccept, type Claim } from './generated.js';
export * from './generated.js';
export const protocolStatus = 'candidate-int-01-not-approved';
const halfOrder = 0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0n;
function bytes32(value: string): Hex {
  if (!/^0x[0-9a-f]{64}$/i.test(value)) throw new Error('Expected bytes32');
  return value as Hex;
}
function uint256(value: bigint) {
  if (typeof value !== 'bigint' || value < 0n || value >= 1n << 256n) throw new Error('Invalid uint256');
}
function address(value: string): Address {
  if (!isAddress(value) || /^0x0{40}$/i.test(value)) throw new Error('Invalid nonzero address');
  return value as Address;
}
function domain(name: string, chainId: number, verifyingContract: string) {
  if (!Number.isSafeInteger(chainId) || chainId <= 0) throw new Error('Invalid chain ID');
  return { name, version: '1', chainId, verifyingContract: address(verifyingContract) } as const;
}
export const meetDomain = (chainId: number, verifyingContract: string) => domain('MootzMeetRegistry', chainId, verifyingContract);
export const collectionDomain = (chainId: number, verifyingContract: string) => domain('MootzEventCollection', chainId, verifyingContract);
type Domain = ReturnType<typeof meetDomain>;
export function uuidBytes32(uuid: string): Hex {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) throw new Error('Invalid UUID');
  return `0x${uuid.replaceAll('-', '').toLowerCase()}${'0'.repeat(32)}`;
}
export function photoCommitment(momentId: string, frontDigest: string, backDigest: string, salt: string): Hex {
  return keccak256(encodeAbiParameters([{ type: 'uint256' }, { type: 'bytes32' }, { type: 'bytes32' }, { type: 'bytes32' }, { type: 'bytes32' }], [1n, bytes32(momentId), bytes32(frontDigest), bytes32(backDigest), bytes32(salt)]));
}
// Storage SHA256/salt hex remains private; this adapter does not rewrite the stored snapshot.
export function storedPhotoCommitment(momentId: string, frontSha256: string, backSha256: string, salt: string): Hex {
  for (const value of [frontSha256, backSha256, salt]) if (!/^[0-9a-f]{64}$/i.test(value)) throw new Error('Invalid storage digest or salt');
  return photoCommitment(uuidBytes32(momentId), `0x${frontSha256}`, `0x${backSha256}`, `0x${salt}`);
}
export function canonicalSignature(value: string): Hex {
  if (!/^0x[0-9a-f]{128}(1b|1c)$/i.test(value)) throw new Error('Expected canonical 65-byte signature');
  const r = BigInt(`0x${value.slice(2, 66)}`);
  const s = BigInt(`0x${value.slice(66, 130)}`);
  if (r === 0n || r >= halfOrder * 2n + 1n || s === 0n || s > halfOrder) throw new Error('Invalid signature scalar');
  return value as Hex;
}
function action(value: Hex) {
  if (value !== RECORD_MEET && value !== OFFCHAIN_MEET) throw new Error('Invalid Meet action');
}
function offerData(domain: Domain, message: MeetOffer) {
  action(message.action);
  for (const value of [message.meetId, message.momentId, message.photoCommitment, message.nonce, message.eventId]) bytes32(value);
  address(message.poster); uint256(message.issuedAt); uint256(message.expiresAt);
  return { domain, types: meetTypes, primaryType: 'MeetOffer', message } as const;
}
function acceptData(domain: Domain, message: MeetAccept) {
  action(message.action); bytes32(message.offerDigest); address(message.scanner);
  return { domain, types: meetTypes, primaryType: 'MeetAccept', message } as const;
}
function claimData(domain: Domain, message: Claim) {
  uint256(message.collectionId); uint256(message.deadline); bytes32(message.nonce); address(message.recipient); address(message.issuer);
  return { domain, types: claimTypes, primaryType: 'Claim', message } as const;
}
export const hashOffer = (domain: Domain, message: MeetOffer) => hashTypedData(offerData(domain, message));
export const hashAccept = (domain: Domain, message: MeetAccept) => hashTypedData(acceptData(domain, message));
export const hashClaim = (domain: Domain, message: Claim) => hashTypedData(claimData(domain, message));
export const recoverOffer = (domain: Domain, message: MeetOffer, signature: string) => recoverTypedDataAddress({ ...offerData(domain, message), signature: canonicalSignature(signature) });
export const recoverAccept = (domain: Domain, message: MeetAccept, signature: string) => recoverTypedDataAddress({ ...acceptData(domain, message), signature: canonicalSignature(signature) });
export const recoverClaim = (domain: Domain, message: Claim, signature: string) => recoverTypedDataAddress({ ...claimData(domain, message), signature: canonicalSignature(signature) });
