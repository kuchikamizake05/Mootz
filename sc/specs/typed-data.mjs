import { encodeAbiParameters, keccak256, stringToHex } from 'viem';

export const protocolStatus = 'candidate-int-01-not-approved';
export const RECORD_MEET = keccak256(stringToHex('RECORD_MEET'));
export const OFFCHAIN_MEET = keccak256(stringToHex('OFFCHAIN_MEET'));
export const meetTypes = {
  MeetOffer: [
    { name: 'action', type: 'bytes32' },
    { name: 'meetId', type: 'bytes32' },
    { name: 'momentId', type: 'bytes32' },
    { name: 'photoCommitment', type: 'bytes32' },
    { name: 'poster', type: 'address' },
    { name: 'nonce', type: 'bytes32' },
    { name: 'issuedAt', type: 'uint256' },
    { name: 'expiresAt', type: 'uint256' },
    { name: 'eventId', type: 'bytes32' },
  ],
  MeetAccept: [
    { name: 'action', type: 'bytes32' },
    { name: 'offerDigest', type: 'bytes32' },
    { name: 'scanner', type: 'address' },
  ],
};
export const claimTypes = {
  Claim: [
    { name: 'collectionId', type: 'uint256' },
    { name: 'recipient', type: 'address' },
    { name: 'issuer', type: 'address' },
    { name: 'nonce', type: 'bytes32' },
    { name: 'deadline', type: 'uint256' },
  ],
};
export function meetDomain(chainId, verifyingContract) {
  return { name: 'MootzMeetRegistry', version: '1', chainId, verifyingContract };
}
export function collectionDomain(chainId, verifyingContract) {
  return { name: 'MootzEventCollection', version: '1', chainId, verifyingContract };
}
// Candidate encoding; current backend SHA256 pair commitment is NOT compatible without an explicit adapter.
// front/back digests are SHA256 of immutable normalized asset bytes, represented as raw bytes32.
export function photoCommitment(momentId, frontDigest, backDigest, salt) {
  return keccak256(encodeAbiParameters(
    [{ type: 'uint256' }, ...Array.from({ length: 4 }, () => ({ type: 'bytes32' }))],
    [1n, momentId, frontDigest, backDigest, salt],
  ));
}
// UUIDs are the 16 UUID bytes right-padded with 16 zero bytes; no text hashing or byte-order reversal.
export function uuidBytes32(uuid) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) {
    throw new Error('Invalid UUID');
  }
  return `0x${uuid.replaceAll('-', '').toLowerCase()}${'0'.repeat(32)}`;
}
