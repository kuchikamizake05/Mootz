import { createLocalJWKSet, importSPKI, jwtVerify } from 'jose';

export interface TokenVerifier {
  verify(token: string): Promise<{ subject: string }>;
}

export class AuthError extends Error {
  constructor() {
    super('Invalid access token');
    this.name = 'AuthError';
  }
}

export async function createTokenVerifier(options: { appId: string; verificationKey: string }): Promise<TokenVerifier> {
  if (!options.appId.trim()) throw new Error('Privy app ID is required');
  const key = options.verificationKey.trimStart().startsWith('{')
    ? createLocalJWKSet(JSON.parse(options.verificationKey))
    : await importSPKI(options.verificationKey, 'ES256');
  return {
    async verify(token) {
      try {
        const { payload } = await jwtVerify(token, key, {
          algorithms: ['ES256'],
          issuer: 'privy.io',
          audience: options.appId,
          requiredClaims: ['sub', 'iat', 'exp'],
        });
        const now = Math.floor(Date.now() / 1000);
        if (typeof payload.sub !== 'string' || !/^did:privy:[^\s]+$/.test(payload.sub)
          || typeof payload.iat !== 'number' || payload.iat > now
          || typeof payload.exp !== 'number' || payload.exp <= payload.iat) {
          throw new AuthError();
        }
        return { subject: payload.sub };
      } catch {
        throw new AuthError();
      }
    },
  };
}
