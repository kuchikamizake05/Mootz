import { randomBytes, randomUUID } from 'node:crypto';
import { getAddress, isAddress, verifyMessage, type Hex } from 'viem';
import type { Pool } from 'pg';

export interface WalletChallenge {
  id: string;
  subject: string;
  wallet: string;
  message: string;
  expiresAt: Date;
}

export interface ChallengeRepository {
  insert(challenge: WalletChallenge): Promise<void>;
  find(id: string): Promise<WalletChallenge | undefined>;
  consume(challenge: WalletChallenge, now: Date): Promise<boolean>;
}

export class WalletProofError extends Error {
  constructor() { super('Invalid or expired wallet proof'); }
}

/** EOA control proof only. This does not establish Event ownership or a unique human. */
export function createWalletChallengeService(repository: ChallengeRepository, domain: string) {
  if (!/^[a-zA-Z0-9.-]+(?::\d+)?$/.test(domain)) throw new Error('Invalid wallet challenge domain');
  return {
    async issue(subject: string, wallet: string, now = new Date()): Promise<WalletChallenge> {
      if (!subject || subject.length > 255 || /[\r\n]/.test(subject) || !isAddress(wallet)) throw new WalletProofError();
      const challenge: WalletChallenge = {
        id: randomUUID(), subject, wallet: getAddress(wallet).toLowerCase(),
        expiresAt: new Date(now.getTime() + 300_000), message: '',
      };
      challenge.message = [
        `${domain} requests wallet control verification for Mootz.`,
        `Account: ${subject}`, `Wallet: ${challenge.wallet}`,
        `Challenge: ${challenge.id}`, `Nonce: ${randomBytes(32).toString('hex')}`,
        `Issued at: ${now.toISOString()}`, `Expires at: ${challenge.expiresAt.toISOString()}`,
        'This proof does not authorize a transaction or an onchain Meet record.',
      ].join('\n');
      await repository.insert(challenge);
      return challenge;
    },
    async verify(subject: string, id: string, wallet: string, signature: string, now = new Date()): Promise<WalletChallenge> {
      if (!isAddress(wallet) || !/^0x[0-9a-fA-F]{130}$/.test(signature)) throw new WalletProofError();
      const challenge = await repository.find(id);
      if (!challenge || challenge.subject !== subject || challenge.wallet !== wallet.toLowerCase()
        || challenge.expiresAt.getTime() <= now.getTime()
        || !challenge.message.startsWith(`${domain} requests wallet control verification for Mootz.\n`)) throw new WalletProofError();
      let valid = false;
      try { valid = await verifyMessage({ address: getAddress(wallet), message: challenge.message, signature: signature as Hex }); }
      catch { throw new WalletProofError(); }
      if (!valid || !await repository.consume(challenge, now)) throw new WalletProofError();
      return challenge;
    },
  };
}

export function createPostgresChallengeRepository(pool: Pick<Pool, 'query'>): ChallengeRepository {
  return {
    async insert(c) {
      await pool.query('INSERT INTO wallet_challenges (id, subject, wallet, message, expires_at) VALUES ($1,$2,$3,$4,$5)', [c.id, c.subject, c.wallet, c.message, c.expiresAt]);
    },
    async find(id) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return undefined;
      const result = await pool.query<{ id: string; subject: string; wallet: string; message: string; expires_at: Date }>('SELECT id, subject, wallet, message, expires_at FROM wallet_challenges WHERE id=$1 AND consumed_at IS NULL', [id]);
      const row = result.rows[0];
      return row && { id: row.id, subject: row.subject, wallet: row.wallet, message: row.message, expiresAt: row.expires_at };
    },
    async consume(c, now) {
      const result = await pool.query('UPDATE wallet_challenges SET consumed_at=$1 WHERE id=$2 AND subject=$3 AND wallet=$4 AND message=$5 AND consumed_at IS NULL AND expires_at>$1 RETURNING id', [now, c.id, c.subject, c.wallet, c.message]);
      return result.rowCount === 1;
    },
  };
}
