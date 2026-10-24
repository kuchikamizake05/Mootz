// Copies canonical public SC exports into the web client. Never edit the copies by hand.
// Usage: node scripts/sync-protocol.mjs [--check]
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';

const sc = new URL('../../../sc/', import.meta.url);
const target = new URL('../src/lib/chain/generated/', import.meta.url);
const check = process.argv.includes('--check');

const files = [
  ['specs/protocol.ts', 'protocol.ts'],
  ['specs/typed-data.mjs', 'typed-data.mjs'],
  ['specs/vectors.json', 'vectors.json'],
  ...readdirSync(new URL('abi/', sc))
    .filter((name) => name.endsWith('.json'))
    .map((name) => [`abi/${name}`, `abi/${name}`]),
];

const drift = [];
for (const [from, to] of files) {
  const source = readFileSync(new URL(from, sc), 'utf8');
  const dest = new URL(to, target);
  let current = null;
  try {
    current = readFileSync(dest, 'utf8');
  } catch {}
  if (current === source) continue;
  if (check) drift.push(to);
  else {
    mkdirSync(new URL('.', dest), { recursive: true });
    writeFileSync(dest, source);
  }
}

if (drift.length) {
  console.error(`Web protocol drift (${drift.join(', ')}): run npm run sync:protocol from fe/web`);
  process.exit(1);
}
console.log(check ? 'Web protocol matches canonical sc/ exports exactly.' : `Synced ${files.length} files from sc/.`);
