import { monad, monadTestnet } from 'viem/chains';
import { env } from '@/lib/env';

if (env.chainId !== 143 && env.chainId !== 10143) throw new Error('Unsupported Monad chain');
export const mootzChain = env.chainId === 143 ? monad : monadTestnet;
