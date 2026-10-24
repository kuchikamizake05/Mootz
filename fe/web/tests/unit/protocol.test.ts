import { describe, expect, it } from 'vitest';
import { hashTypedData, keccak256, recoverTypedDataAddress, stringToHex, type Address, type Hex } from 'viem';
import { claimTypes, meetTypes, OFFCHAIN_MEET, RECORD_MEET, type Claim, type MeetAccept, type MeetOffer } from '@/lib/chain/generated/protocol';
import { collectionDomain, meetDomain, photoCommitment, uuidBytes32 } from '@/lib/chain/generated/typed-data.mjs';
import vectors from '@/lib/chain/generated/vectors.json';

// The fixture domains are synthetic; real code must use the deployed chainId and verifyingContract.
const registryDomain = meetDomain(vectors.domain.chainId, vectors.domain.verifyingContract as Address);
const claimDomain = collectionDomain(vectors.collectionDomain.chainId, vectors.collectionDomain.verifyingContract as Address);

const toOffer = (raw: typeof vectors.offer): MeetOffer => ({
  ...(raw as unknown as MeetOffer),
  issuedAt: BigInt(raw.issuedAt),
  expiresAt: BigInt(raw.expiresAt),
});
const offer = toOffer(vectors.offer);
const offchainOffer = toOffer(vectors.offchainOffer);
const accept = vectors.accept as MeetAccept;
const offchainAccept = vectors.offchainAccept as MeetAccept;
const claim: Claim = {
  ...(vectors.claim as unknown as Claim),
  collectionId: BigInt(vectors.claim.collectionId),
  deadline: BigInt(vectors.claim.deadline),
};

const offerDigest = (message: MeetOffer) =>
  hashTypedData({ domain: registryDomain, types: meetTypes, primaryType: 'MeetOffer', message });
const acceptDigest = (message: MeetAccept) =>
  hashTypedData({ domain: registryDomain, types: meetTypes, primaryType: 'MeetAccept', message });

describe('canonical signing protocol (sc/specs)', () => {
  it('derives the action constants from their UTF-8 names', () => {
    expect(RECORD_MEET).toBe(keccak256(stringToHex('RECORD_MEET')));
    expect(OFFCHAIN_MEET).toBe(keccak256(stringToHex('OFFCHAIN_MEET')));
  });

  it('computes Offer and Accept digests for RECORD_MEET', () => {
    expect(offerDigest(offer)).toBe(vectors.offerDigest);
    expect(accept.offerDigest).toBe(offerDigest(offer));
    expect(acceptDigest(accept)).toBe(vectors.acceptDigest);
  });

  it('computes Offer and Accept digests for OFFCHAIN_MEET', () => {
    expect(offerDigest(offchainOffer)).toBe(vectors.offchainOfferDigest);
    expect(acceptDigest(offchainAccept)).toBe(vectors.offchainAcceptDigest);
  });

  it('computes the Claim digest with the collection domain', () => {
    const digest = hashTypedData({ domain: claimDomain, types: claimTypes, primaryType: 'Claim', message: claim });
    expect(digest).toBe(vectors.claimDigest);
  });

  it('recovers the expected signers from the fixture signatures', async () => {
    const poster = await recoverTypedDataAddress({
      domain: registryDomain, types: meetTypes, primaryType: 'MeetOffer', message: offer, signature: vectors.offerSignature as Hex,
    });
    const scanner = await recoverTypedDataAddress({
      domain: registryDomain, types: meetTypes, primaryType: 'MeetAccept', message: accept, signature: vectors.acceptSignature as Hex,
    });
    const issuer = await recoverTypedDataAddress({
      domain: claimDomain, types: claimTypes, primaryType: 'Claim', message: claim, signature: vectors.claimSignature as Hex,
    });
    expect(poster).toBe(offer.poster);
    expect(scanner).toBe(accept.scanner);
    expect(issuer).toBe(claim.issuer);
  });

  it('changes the digest when any signed field or the domain changes', () => {
    expect(offerDigest({ ...offer, expiresAt: offer.expiresAt + 1n })).not.toBe(vectors.offerDigest);
    expect(acceptDigest({ ...accept, scanner: offer.poster })).not.toBe(vectors.acceptDigest);
    const otherChain = hashTypedData({
      domain: meetDomain(1, vectors.domain.verifyingContract as Address), types: meetTypes, primaryType: 'MeetOffer', message: offer,
    });
    expect(otherChain).not.toBe(vectors.offerDigest);
  });
});

describe('photo commitment', () => {
  const { momentId, frontDigest, backDigest, salt } = vectors.commitmentInput as unknown as Record<string, Hex>;

  it('matches the Offer commitment', () => {
    expect(photoCommitment(momentId, frontDigest, backDigest, salt)).toBe(offer.photoCommitment);
  });

  it('differs when front and back are swapped', () => {
    expect(photoCommitment(momentId, backDigest, frontDigest, salt)).not.toBe(offer.photoCommitment);
  });

  it('differs when the salt changes', () => {
    const otherSalt = `0x${'00'.repeat(31)}01` as Hex;
    expect(photoCommitment(momentId, frontDigest, backDigest, otherSalt)).not.toBe(offer.photoCommitment);
  });
});

describe('uuidBytes32', () => {
  it('right-pads the 16 raw UUID bytes to bytes32', () => {
    expect(uuidBytes32('11111111-2222-4333-8444-555555555555')).toBe(vectors.commitmentInput.momentId);
    expect(uuidBytes32('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')).toBe(offer.meetId);
  });

  it('rejects non-UUID input', () => {
    expect(() => uuidBytes32('not-a-uuid')).toThrow('Invalid UUID');
  });
});
