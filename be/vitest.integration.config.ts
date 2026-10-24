import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['test/*.integration.ts'], fileParallelism: false, setupFiles: ['test/support/integration-setup.ts'] } });
