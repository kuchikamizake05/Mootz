import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { coverage: {
  provider: 'v8', include: ['src/config.ts', 'src/app.ts', 'src/database.ts', 'src/auth/**/*.ts', 'src/profile/**/*.ts', 'src/wallet/**/*.ts', 'src/media/**/*.ts', 'src/moments/**/*.ts', 'src/friends/**/*.ts', 'src/streak/**/*.ts', 'src/comments/**/*.ts', 'src/events/**/*.ts', 'src/collections/**/*.ts','src/frames/**/*.ts', 'src/reactions/**/*.ts', 'src/protocol/index.ts', 'src/meet/**/*.ts', 'src/dots/**/*.ts', 'src/relay/worker.ts','src/relay/viem.ts','src/chain/**/*.ts','src/claim-relay/config.ts','src/claim-relay/routes.ts','src/claim-relay/worker.ts','src/claim-relay/viem.ts','src/chain-sync/index.ts','src/chain-sync/viem.ts','src/relay/inspect.ts'],
  thresholds: { lines: 80, functions: 80, statements: 80, branches: 80 },
} } });
