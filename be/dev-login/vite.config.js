import { defineConfig } from 'vite';
import { vulnerableRuntimeGuard } from './scripts/vulnerable-runtime-guard.mjs';

export default defineConfig({
  plugins: [vulnerableRuntimeGuard()],
  optimizeDeps: { entries: ['index.html'] },
});
