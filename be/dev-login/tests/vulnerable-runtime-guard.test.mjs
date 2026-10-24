import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { build } from 'vite';
import { assertSafeBundle, vulnerableRuntimeGuard } from '../scripts/vulnerable-runtime-guard.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = (name) => path.join(projectRoot, 'tests', 'fixtures', name, 'index.html');

async function buildInput(input, resolve = undefined) {
  return build({
    configFile: false,
    logLevel: 'silent',
    root: projectRoot,
    plugins: [vulnerableRuntimeGuard({ projectRoot })],
    resolve,
    build: { write: false, rollupOptions: { input } },
  });
}

test('production bundle excludes vulnerable transitive parser implementations', async () => {
  await buildInput(path.join(projectRoot, 'index.html'));
});

async function assertRejectedBySecurityGate(input, label, resolve = undefined) {
  await assert.rejects(buildInput(input, resolve), (error) => {
    assert.match(error.message, /SECURITY_GATE:/);
    assert.match(error.message, new RegExp(label));
    return true;
  });
}

test('build gate rejects a real W3mFrame listener import', async () => {
  await assertRejectedBySecurityGate(fixture('unsafe-frame'), 'W3mFrame');
});

test('build gate rejects a real uuid v5 import through v35', async () => {
  await assertRejectedBySecurityGate(fixture('unsafe-uuid-v5'), 'uuid');
});

test('build gate rejects Coinbase policy collection schemas', async () => {
  const cdpZod = path.join(projectRoot, 'node_modules/@coinbase/cdp-sdk/node_modules/zod/index.js');
  await assertRejectedBySecurityGate(
    fixture('unsafe-cdp-policy'),
    'Coinbase CDP/x402 code',
    { alias: [{ find: 'zod', replacement: cdpZod }] },
  );
});

test('build gate rejects x402 collection schemas', async () => {
  await assertRejectedBySecurityGate(fixture('unsafe-x402-schema'), 'x402');
});

test('build gate rejects a new direct Zod 3 collection consumer', async () => {
  await assertRejectedBySecurityGate(fixture('unsafe-zod3-consumer'), 'unreviewed Zod 3 consumer');
});

test('build gate rejects direct Zod 3.22.4 imports through a legacy SDK entrypoint', async () => {
  await assertRejectedBySecurityGate(fixture('unsafe-zod322-consumer'), 'unreviewed Zod 3 consumer');
});

test('build gate rejects a Zod 3 import through a first-party static barrel', async () => {
  await assertRejectedBySecurityGate(fixture('unsafe-zod3-static-barrel'), 'unreviewed Zod 3 consumer');
});

test('build gate rejects a Zod 3 import through a first-party dynamic barrel', async () => {
  await assertRejectedBySecurityGate(fixture('unsafe-zod3-dynamic-barrel'), 'unreviewed Zod 3 consumer');
});

for (const edgeType of ['importedIds', 'dynamicallyImportedIds']) {
  test(`bundle guard follows ${edgeType} through a zero-rendered barrel`, () => {
    const entryId = path.join(projectRoot, 'tests', 'generated-entry.js');
    const barrelId = path.join(projectRoot, 'src', 'generated-zod-barrel.js');
    const zodId = path.join(
      projectRoot,
      'node_modules',
      '@reown',
      'appkit-wallet',
      'node_modules',
      'zod',
      'lib',
      'index.mjs',
    );
    const bundle = {
      'app.js': {
        type: 'chunk',
        modules: {
          [entryId]: { renderedLength: 24 },
          [barrelId]: { renderedLength: 0 },
          [zodId]: { renderedLength: 48 },
        },
      },
    };
    const graph = new Map([
      [entryId, { [edgeType]: [barrelId] }],
      [barrelId, { importedIds: [zodId] }],
      [zodId, { importedIds: [] }],
    ]);
    assert.throws(
      () => assertSafeBundle(bundle, (id) => graph.get(id)),
      /SECURITY_GATE: unreviewed Zod 3 consumer/,
    );
  });
}

test('zero-rendered vulnerable module stubs do not count as shipped code', () => {
  const bundle = {
    'empty.js': {
      type: 'chunk',
      modules: {
        '/project/node_modules/@reown/appkit-wallet/dist/esm/src/W3mFrame.js': {
          renderedLength: 0,
        },
      },
    },
  };

  assert.doesNotThrow(() => assertSafeBundle(bundle));
});

async function makeNestedApiBase(t, { version = '1.12.0', alteredRuntime = false } = {}) {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'mootz-security-gate-'));
  t.after(() => rm(tempRoot, { recursive: true, force: true }));
  const packageRoot = path.join(tempRoot, 'nested', 'node_modules', '@privy-io', 'api-base');
  const runtimePath = path.join(packageRoot, 'dist', 'esm', 'index.mjs');
  await mkdir(path.dirname(runtimePath), { recursive: true });

  const installedRoot = path.join(projectRoot, 'node_modules', '@privy-io', 'api-base');
  const packageJson = JSON.parse(await readFile(path.join(installedRoot, 'package.json'), 'utf8'));
  packageJson.version = version;
  await writeFile(path.join(packageRoot, 'package.json'), JSON.stringify(packageJson));
  const runtime = await readFile(path.join(installedRoot, 'dist', 'esm', 'index.mjs'));
  await writeFile(runtimePath, alteredRuntime ? Buffer.concat([runtime, Buffer.from('\n// drift')]) : runtime);
  return runtimePath;
}

function bundleForModule(moduleId, renderedLength = 1) {
  return {
    'app.js': {
      type: 'chunk',
      modules: { [moduleId]: { renderedLength } },
    },
  };
}

test('api-base policy checks a nested copy and normalizes Windows separators and query suffixes', async (t) => {
  const runtimePath = await makeNestedApiBase(t);
  const windowsModuleId = `${runtimePath.replaceAll('/', '\\')}?v=reviewed`;
  assert.doesNotThrow(() => assertSafeBundle(bundleForModule(windowsModuleId), () => ({ importedIds: [] })));
});

test('api-base policy fails closed on version drift', async (t) => {
  const runtimePath = await makeNestedApiBase(t, { version: '1.12.1' });
  assert.throws(
    () => assertSafeBundle(bundleForModule(runtimePath)),
    /SECURITY_GATE: expected @privy-io\/api-base@1\.12\.0/,
  );
});

test('api-base policy fails closed on runtime hash drift', async (t) => {
  const runtimePath = await makeNestedApiBase(t, { alteredRuntime: true });
  assert.throws(
    () => assertSafeBundle(bundleForModule(runtimePath)),
    /SECURITY_GATE: @privy-io\/api-base@1\.12\.0 runtime changed/,
  );
});

test('api-base policy rejects an unreviewed CommonJS entrypoint', async (t) => {
  const runtimePath = await makeNestedApiBase(t);
  const packageRoot = path.dirname(path.dirname(path.dirname(runtimePath)));
  const cjsPath = path.join(packageRoot, 'dist', 'cjs', 'index.js');
  assert.throws(
    () => assertSafeBundle(bundleForModule(cjsPath)),
    /SECURITY_GATE: unreviewed @privy-io\/api-base entrypoint emitted/,
  );
});

test('AppKit allowlist fails closed when its reviewed package version changes', async (t) => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'mootz-appkit-gate-'));
  t.after(() => rm(tempRoot, { recursive: true, force: true }));
  const packageRoot = path.join(tempRoot, 'node_modules', '@reown', 'appkit-wallet');
  await mkdir(path.join(packageRoot, 'dist', 'esm', 'src'), { recursive: true });
  await writeFile(
    path.join(packageRoot, 'package.json'),
    JSON.stringify({ name: '@reown/appkit-wallet', version: '1.8.20' }),
  );
  const modulePath = path.join(packageRoot, 'dist', 'esm', 'src', 'W3mFrameConstants.js');
  assert.throws(
    () => assertSafeBundle(bundleForModule(modulePath)),
    /SECURITY_GATE: AppKit wallet changed from reviewed/,
  );
});

test('missing rendered-length metadata fails closed for vulnerable dependency families', () => {
  assert.throws(
    () => assertSafeBundle({ 'app.js': { type: 'chunk', modules: {
      '/repo/node_modules/uuid/dist/esm-browser/v5.js': {},
    } } }),
    /SECURITY_GATE: unreviewed uuid implementation emitted/,
  );
});
