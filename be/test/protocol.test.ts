import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { meetDomain, collectionDomain, hashOffer, hashAccept, hashClaim, recoverOffer, recoverAccept, recoverClaim, uuidBytes32, photoCommitment, storedPhotoCommitment, canonicalSignature, type MeetOffer, type MeetAccept, type Claim } from '../src/protocol/index.ts';
import type { Hex } from 'viem';
const v = JSON.parse(readFileSync(new URL('../../sc/specs/vectors.json', import.meta.url), 'utf8'));
const domain = meetDomain(v.domain.chainId, v.domain.verifyingContract);
function offer(value: MeetOffer): MeetOffer { return { ...value, issuedAt: BigInt(value.issuedAt), expiresAt: BigInt(value.expiresAt) }; }
describe('SC canonical candidate protocol interoperability', () => {
  it('matches canonical hashes and signers including opt-out and claim', async () => {
    for (const [o, a] of [['offer', 'accept'], ['offchainOffer', 'offchainAccept']] as const) {
      expect(hashOffer(domain, offer(v[o]))).toBe(v[`${o}Digest`]);
      expect(await recoverOffer(domain, offer(v[o]), v[`${o}Signature`])).toBe(v.offer.poster);
      expect(hashAccept(domain, v[a] as MeetAccept)).toBe(v[`${a}Digest`]);
      expect(await recoverAccept(domain, v[a], v[`${a}Signature`])).toBe(v.accept.scanner);
    }
    const cd = collectionDomain(v.collectionDomain.chainId, v.collectionDomain.verifyingContract);
    const claim: Claim = { ...v.claim, collectionId: BigInt(v.claim.collectionId), deadline: BigInt(v.claim.deadline) };
    expect(hashClaim(cd, claim)).toBe(v.claimDigest);
    expect(await recoverClaim(cd, claim, v.claimSignature)).toBe(v.claim.issuer);
  });
  it('encodes UUID and ordered immutable SHA256 assets with salt', () => {
    const c = v.commitmentInput;
    expect(uuidBytes32('11111111-2222-4333-8444-555555555555')).toBe(c.momentId);
    expect(photoCommitment(c.momentId, c.frontDigest, c.backDigest, c.salt)).toBe(v.offer.photoCommitment);
    expect(storedPhotoCommitment('11111111-2222-4333-8444-555555555555', c.frontDigest.slice(2), c.backDigest.slice(2), c.salt.slice(2))).toBe(v.offer.photoCommitment);
    expect(photoCommitment(c.momentId, c.backDigest, c.frontDigest, c.salt)).not.toBe(v.offer.photoCommitment);
    expect(photoCommitment(c.momentId, c.frontDigest, c.backDigest, c.frontDigest)).not.toBe(v.offer.photoCommitment);
  });
  it('separates domains and rejects malformed encoding or signatures', () => {
    expect(hashOffer(meetDomain(1, v.domain.verifyingContract), offer(v.offer))).not.toBe(v.offerDigest);
    expect(hashOffer(meetDomain(10143, v.collectionDomain.verifyingContract), offer(v.offer))).not.toBe(v.offerDigest);
    expect(hashOffer({ ...domain, version: '2' as '1' }, offer(v.offer))).not.toBe(v.offerDigest);
    expect(hashOffer({ ...domain, name: 'OtherRegistry' }, offer(v.offer))).not.toBe(v.offerDigest);
    expect(hashAccept(domain, { ...v.accept, offerDigest: v.offchainOfferDigest })).not.toBe(v.acceptDigest);
    expect(() => hashOffer(domain, { ...offer(v.offer), action: `0x${'00'.repeat(32)}` })).toThrow();
    expect(() => hashOffer(domain, { ...offer(v.offer), issuedAt: -1n })).toThrow();
    expect(() => meetDomain(0, v.domain.verifyingContract)).toThrow();
    expect(() => meetDomain(10143, `0x${'0'.repeat(40)}`)).toThrow();
    expect(() => uuidBytes32('invalid')).toThrow();
    expect(() => photoCommitment('0x01', v.commitmentInput.frontDigest, v.commitmentInput.backDigest, v.commitmentInput.salt)).toThrow();
    expect(() => storedPhotoCommitment('11111111-2222-4333-8444-555555555555', 'zz'.repeat(32), '00'.repeat(32), '00'.repeat(32))).toThrow();
    expect(() => canonicalSignature('0x12')).toThrow();
    expect(() => canonicalSignature(`${v.offerSignature.slice(0, -2)}00` as Hex)).toThrow();
    expect(() => canonicalSignature(`0x${'11'.repeat(32)}${'ff'.repeat(32)}1b`)).toThrow();
  });
});
