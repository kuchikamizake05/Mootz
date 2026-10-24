import { beforeAll, expect, it } from 'vitest';
import { exportJWK, exportSPKI, generateKeyPair, SignJWT } from 'jose';
import { createTokenVerifier, type TokenVerifier } from '../src/auth/token.ts';
let verifier: TokenVerifier;
let pair: Awaited<ReturnType<typeof generateKeyPair>>;
beforeAll(async () => {
  pair = await generateKeyPair('ES256');
  verifier = await createTokenVerifier({ appId: 'mootz-test', verificationKey: await exportSPKI(pair.publicKey) });
});
async function token(claims: Record<string, unknown> = {}, key = pair.privateKey, alg = 'ES256') {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ iss: 'privy.io', aud: 'mootz-test', sub: 'did:privy:test', iat: now, exp: now + 300, ...claims }).setProtectedHeader({ alg }).sign(key);
}
it('returns only verified subject and ignores wallet claims', async () => {
  expect(await verifier.verify(await token({ wallet: 'attacker' }))).toEqual({ subject: 'did:privy:test' });
});
it.each([{ iss: 'evil' }, { aud: 'other' }, { exp: 1 }, { sub: '' }, { sub: 'user' }, { sub: undefined }, { exp: undefined }, { iat: undefined }, { iat: 'bad' }, { iat: Math.floor(Date.now() / 1000) + 300 }])('rejects invalid claims %j', async claims => {
  await expect(verifier.verify(await token(claims))).rejects.toThrow('Invalid access token');
});
it('rejects forged signatures', async () => {
  const other = await generateKeyPair('ES256');
  await expect(verifier.verify(await token({}, other.privateKey))).rejects.toThrow('Invalid access token');
});
it('rejects other algorithms', async () => {
  const other = await generateKeyPair('RS256');
  await expect(verifier.verify(await token({}, other.privateKey, 'RS256'))).rejects.toThrow('Invalid access token');
});
it.each(['', 'malformed', 'eyJhbGciOiJub25lIn0.e30.'])('rejects malformed token %s', async value => {
  await expect(verifier.verify(value)).rejects.toThrow('Invalid access token');
});
it('rejects invalid verification key configuration at startup', async () => {
  await expect(createTokenVerifier({ appId: 'mootz-test', verificationKey: 'not-a-public-key' })).rejects.toThrow();
});
it('rejects empty app ID at startup', async () => {
  await expect(createTokenVerifier({ appId: ' ', verificationKey: await exportSPKI(pair.publicKey) })).rejects.toThrow('Privy app ID is required');
});
it('accepts both public JWKS signing keys and rejects an unknown key', async () => {
  const second = await generateKeyPair('ES256');
  const keys = [{ ...await exportJWK(pair.publicKey), kid: 'first', alg: 'ES256' }, { ...await exportJWK(second.publicKey), kid: 'second', alg: 'ES256' }];
  const multi = await createTokenVerifier({ appId: 'mootz-test', verificationKey: JSON.stringify({ keys }) });
  for (const [kid, key] of [['first', pair.privateKey], ['second', second.privateKey]] as const) {
    const signed = await new SignJWT({}).setProtectedHeader({ alg: 'ES256', kid }).setIssuer('privy.io').setAudience('mootz-test').setSubject('did:privy:test').setIssuedAt().setExpirationTime('5m').sign(key);
    expect(await multi.verify(signed)).toEqual({ subject: 'did:privy:test' });
  }
  const unknown = await new SignJWT({}).setProtectedHeader({ alg: 'ES256', kid: 'unknown' }).setIssuer('privy.io').setAudience('mootz-test').setSubject('did:privy:test').setIssuedAt().setExpirationTime('5m').sign(pair.privateKey);
  await expect(multi.verify(unknown)).rejects.toThrow('Invalid access token');
});
