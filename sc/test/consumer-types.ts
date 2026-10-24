// Compile-only consumer test for the generated viem types. All values are public fixtures.
import { hashTypedData } from 'viem';
import { meetTypes, claimTypes, RECORD_MEET, type MeetOffer, type MeetAccept, type Claim } from '../specs/protocol.js';
const zero = `0x${'0'.repeat(64)}` as const;
const wallet = '0x1111111111111111111111111111111111111111';
const offer: MeetOffer = { action: RECORD_MEET, meetId: zero, momentId: zero, photoCommitment: zero,
  poster: wallet, nonce: zero, issuedAt: 1n, expiresAt: 61n, eventId: zero };
const domain = { name: 'MootzMeetRegistry', version: '1', chainId: 10143, verifyingContract: wallet } as const;
const offerDigest = hashTypedData({ domain, types: meetTypes, primaryType: 'MeetOffer', message: offer });
const accept: MeetAccept = { action: RECORD_MEET, offerDigest, scanner: wallet };
hashTypedData({ domain, types: meetTypes, primaryType: 'MeetAccept', message: accept });
const claim: Claim = { collectionId: 1n, recipient: wallet, issuer: wallet, nonce: zero, deadline: 300n };
hashTypedData({ domain: { ...domain, name: 'MootzEventCollection' }, types: claimTypes, primaryType: 'Claim', message: claim });
