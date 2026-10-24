import { describe, expect, it } from 'vitest';
import type { Address, Hex } from 'viem';
import vectors from '@/lib/chain/generated/vectors.json';
import {
  canonicalSignature, commitmentMatches, decodeQr, encodeQr, offerDigest, secondsLeft, type MeetDomain, type QrPayload, type SerializedOffer,
} from '@/features/meet/protocol';

const domain = vectors.domain as MeetDomain;
const offer: SerializedOffer = {
  ...(vectors.offer as unknown as SerializedOffer),
  issuedAt: String(vectors.offer.issuedAt),
  expiresAt: String(vectors.offer.expiresAt),
};
const payload: QrPayload = { v: 1, id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', offer, domain, sig: vectors.offerSignature as Hex };
const strip = (h: string) => h.slice(2);

describe('offerDigest', () => {
  it('matches the canonical vector from the serialized backend shape', () => {
    expect(offerDigest(domain, offer)).toBe(vectors.offerDigest);
  });

  it('depends on the actual domain', () => {
    expect(offerDigest({ ...domain, verifyingContract: '0x0000000000000000000000000000000000000001' as Address }, offer)).not.toBe(vectors.offerDigest);
  });
});

describe('QR payload', () => {
  it('round-trips through the URL fragment', () => {
    const url = encodeQr(payload, 'https://mootz.test');
    expect(url.startsWith('https://mootz.test/meet/accept#m=')).toBe(true);
    expect(decodeQr(url)).toEqual(payload);
    expect(decodeQr(url.split('#')[1]!)).toEqual(payload);
  });

  it('carries no location, media or salt', () => {
    const json = JSON.stringify(decodeQr(encodeQr(payload, 'https://mootz.test')));
    for (const key of ['latitude', 'longitude', 'salt', 'url', 'sha256']) expect(json).not.toContain(key);
  });

  it('rejects foreign or malformed codes', () => {
    expect(decodeQr('https://example.com')).toBeNull();
    expect(decodeQr('m=not-base64-json')).toBeNull();
    const bad = encodeQr({ ...payload, offer: { ...offer, meetId: '0x1234' as Hex } }, 'https://mootz.test');
    expect(decodeQr(bad)).toBeNull();
  });
});

describe('canonicalSignature', () => {
  const sig = vectors.offerSignature;
  it('keeps v = 27/28', () => expect(canonicalSignature(sig)).toBe(sig));
  it('normalises v = 0/1', () => {
    const v = parseInt(sig.slice(130), 16) - 27;
    expect(canonicalSignature(sig.slice(0, 130) + v.toString(16).padStart(2, '0'))).toBe(sig);
  });
  it('rejects other lengths and v values', () => {
    expect(() => canonicalSignature('0x1234')).toThrow();
    expect(() => canonicalSignature(sig.slice(0, 130) + '05')).toThrow();
  });
});

describe('commitmentMatches', () => {
  const { frontDigest, backDigest, salt } = vectors.commitmentInput;
  it('accepts the signed pair', () => {
    expect(commitmentMatches(offer, strip(frontDigest), strip(backDigest), strip(salt))).toBe(true);
  });
  it('rejects swapped sides, other bytes or other salt', () => {
    expect(commitmentMatches(offer, strip(backDigest), strip(frontDigest), strip(salt))).toBe(false);
    expect(commitmentMatches(offer, '0'.repeat(64), strip(backDigest), strip(salt))).toBe(false);
    expect(commitmentMatches(offer, strip(frontDigest), strip(backDigest), '1'.repeat(64))).toBe(false);
    expect(commitmentMatches(offer, 'xyz', strip(backDigest), strip(salt))).toBe(false);
  });
});

describe('secondsLeft', () => {
  it('counts down to expiresAt and floors at zero', () => {
    const expires = Number(offer.expiresAt);
    expect(secondsLeft(offer, (expires - 42) * 1000)).toBe(42);
    expect(secondsLeft(offer, (expires + 5) * 1000)).toBe(0);
  });
});
