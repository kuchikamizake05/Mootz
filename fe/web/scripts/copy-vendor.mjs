// Copies runtime files that bundlers don't emit into public/vendor/ (gitignored).
// MapLibre resolves its module worker relative to its own bundle URL, which Turbopack
// doesn't provide, so the app serves the worker itself and points setWorkerUrl() at it.
import { copyFileSync, mkdirSync } from 'node:fs';

const target = new URL('../public/vendor/', import.meta.url);
mkdirSync(target, { recursive: true });
copyFileSync(
  new URL('../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url),
  new URL('maplibre-gl-worker.mjs', target),
);
console.log('Copied maplibre-gl-worker.mjs to public/vendor/.');
