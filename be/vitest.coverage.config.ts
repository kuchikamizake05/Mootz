import { defineConfig, mergeConfig } from 'vitest/config';
import base from './vitest.config.ts';
export default mergeConfig(base, defineConfig({ test: {
  include: ['test/**/*.test.ts', 'test/**/*.integration.ts'],
  fileParallelism: false,
  setupFiles: ['test/support/integration-setup.ts'],
} }));
