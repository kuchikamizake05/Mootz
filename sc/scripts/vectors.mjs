import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { hashTypedData, keccak256, stringToHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { meetTypes, claimTypes, meetDomain, collectionDomain, RECORD_MEET, OFFCHAIN_MEET, photoCommitment, uuidBytes32, protocolStatus } from '../specs/typed-data.mjs';
// Public deterministic TEST ONLY keys. Not funded, not deployment credentials.
const testAccount = (n) => privateKeyToAccount(`0x${n.toString(16).padStart(64, '0')}`);
const poster = testAccount(0xA11CE), scanner = testAccount(0xB0B), issuer = testAccount(0xC0FFEE);
const digest = (text) => `0x${createHash('sha256').update(text).digest('hex')}`;
const momentId = uuidBytes32('11111111-2222-4333-8444-555555555555');
const frontDigest = digest('SYNTHETIC PUBLIC FRONT BYTES');
const backDigest = digest('SYNTHETIC PUBLIC BACK BYTES');
const salt = keccak256(stringToHex('PUBLIC TEST SALT - NEVER USE FOR PRIVATE MEDIA'));
const offer = {
  action: RECORD_MEET, meetId: uuidBytes32('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'), momentId,
  photoCommitment: photoCommitment(momentId, frontDigest, backDigest, salt), poster: poster.address,
  nonce: keccak256(stringToHex('synthetic-offer-nonce')), issuedAt: 1800000000n,
  expiresAt: 1800000060n, eventId: uuidBytes32('99999999-8888-4777-8666-555555555555'),
};
const domain = meetDomain(10143, '0x1111111111111111111111111111111111111111');
const offerData = { domain, types: meetTypes, primaryType: 'MeetOffer', message: offer };
const offerDigest = hashTypedData(offerData);
const accept = { action: RECORD_MEET, offerDigest, scanner: scanner.address };
const acceptData = { domain, types: meetTypes, primaryType: 'MeetAccept', message: accept };
const offchainOffer = { ...offer, action: OFFCHAIN_MEET };
const offchainOfferData = { ...offerData, message: offchainOffer };
const offchainAcceptData = { ...acceptData, message: { ...accept, action: OFFCHAIN_MEET } };
const collection = collectionDomain(10143, '0x2222222222222222222222222222222222222222');
const claim = { collectionId: 1n, recipient: poster.address, issuer: issuer.address,
  nonce: keccak256(stringToHex('synthetic-claim-nonce')), deadline: 1800000300n };
const claimData = { domain: collection, types: claimTypes, primaryType: 'Claim', message: claim };
const result = {
  status: protocolStatus, warning: 'PUBLIC SYNTHETIC FIXTURE. Addresses are not deployed contracts.',
  domain, collectionDomain: collection, types: { ...meetTypes, ...claimTypes },
  commitmentInput: { version: 1, momentId, frontDigest, backDigest, salt },
  offer, offerDigest, offerSignature: await poster.signTypedData(offerData),
  accept, acceptDigest: hashTypedData(acceptData), acceptSignature: await scanner.signTypedData(acceptData),
  offchainOffer, offchainOfferDigest: hashTypedData(offchainOfferData),
  offchainOfferSignature: await poster.signTypedData(offchainOfferData),
  offchainAccept: offchainAcceptData.message, offchainAcceptDigest: hashTypedData(offchainAcceptData),
  offchainAcceptSignature: await scanner.signTypedData(offchainAcceptData),
  claim, claimDigest: hashTypedData(claimData), claimSignature: await issuer.signTypedData(claimData),
};
const json = JSON.stringify(result, (_, value) => typeof value === 'bigint' ? Number(value) : value, 2) + '\n';
const path = fileURLToPath(new URL('../specs/vectors.json', import.meta.url));
if (process.argv.includes('--check')) {
  if (readFileSync(path, 'utf8') !== json) throw new Error('Stale vectors: run npm run vectors');
  console.log('Vectors match canonical viem encoding');
} else { writeFileSync(path, json); console.log('Wrote synthetic protocol vectors'); }
