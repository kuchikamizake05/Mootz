import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const EXPECTED_API_BASE_VERSION = '1.12.0';
const EXPECTED_API_BASE_RUNTIME_SHA256 =
  'CAF35C99A8C4958459CD31BD7A99C5D246FCA2E8EE0666FD8B9A868B2E8D3B89';
const REVIEWED_API_BASE_ZOD_VERSION = '3.25.76';
const REVIEWED_APPKIT_WALLET_VERSION = '1.8.19';
const APPKIT_WALLET_ALLOWLIST = new Set([
  'dist/esm/src/W3mFrameConstants.js',
  'dist/esm/src/RegexUtil.js',
  'dist/esm/src/W3mFrameStorage.js',
  'dist/esm/src/W3mFrameHelpers.js',
]);

function normalizeModuleId(id) {
  return id.replaceAll('\\', '/').split('?')[0];
}

function installedPackageFor(moduleId) {
  const marker = '/node_modules/';
  const offset = moduleId.lastIndexOf(marker);
  if (offset < 0) return undefined;
  const packagePath = moduleId.slice(offset + marker.length).split('/');
  const packageParts = packagePath[0].startsWith('@') ? 2 : 1;
  if (packagePath.length < packageParts) return undefined;
  const packageName = packagePath.slice(0, packageParts).join('/');
  const packageRoot = `${moduleId.slice(0, offset + marker.length)}${packageName}`;
  return {
    name: packageName,
    root: packageRoot,
    relativeId: packagePath.slice(packageParts).join('/'),
  };
}

function packageJsonAt(root) {
  return JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
}

function verifyApiBaseModule({ root, relativeId }) {
  if (relativeId !== 'dist/esm/index.mjs') {
    throw new Error(`SECURITY_GATE: unreviewed @privy-io/api-base entrypoint emitted: ${relativeId}`);
  }

  const packageJson = packageJsonAt(root);
  if (packageJson.version !== EXPECTED_API_BASE_VERSION) {
    throw new Error(
      `SECURITY_GATE: expected @privy-io/api-base@${EXPECTED_API_BASE_VERSION}, found ${packageJson.version}`,
    );
  }

  const runtime = readFileSync(path.join(root, relativeId));
  const hash = createHash('sha256').update(runtime).digest('hex').toUpperCase();
  if (hash !== EXPECTED_API_BASE_RUNTIME_SHA256) {
    throw new Error(
      `SECURITY_GATE: @privy-io/api-base@${packageJson.version} runtime changed; re-review its Zod input schemas`,
    );
  }
}

function isEmitted(metadata) {
  return typeof metadata.renderedLength !== 'number' || metadata.renderedLength > 0;
}

function assertReviewedAppkitModule(installedPackage) {
  if (installedPackage?.name !== '@reown/appkit-wallet') return;
  const packageJson = packageJsonAt(installedPackage.root);
  if (packageJson.version !== REVIEWED_APPKIT_WALLET_VERSION) {
    throw new Error(
      `SECURITY_GATE: AppKit wallet changed from reviewed ${REVIEWED_APPKIT_WALLET_VERSION} to ${packageJson.version}`,
    );
  }
  if (!APPKIT_WALLET_ALLOWLIST.has(installedPackage.relativeId)) {
    throw new Error(`SECURITY_GATE: unreviewed AppKit wallet module emitted: ${installedPackage.relativeId}`);
  }
}

function isVulnerableZodRuntime(installedPackage) {
  if (installedPackage?.name !== 'zod') return false;
  const packageJson = packageJsonAt(installedPackage.root);
  return Number(packageJson.version.split('.')[0]) === 3 || installedPackage.relativeId.startsWith('v3/');
}

function assertZodImportAllowed(sourceId, targetId, apiBaseModules) {
  const source = installedPackageFor(normalizeModuleId(sourceId));
  const target = installedPackageFor(normalizeModuleId(targetId));
  if (!isVulnerableZodRuntime(target)) return;
  if (source?.name === 'zod' && path.resolve(source.root) === path.resolve(target.root)) return;
  if (
    source?.name === '@privy-io/api-base' &&
    source.relativeId === 'dist/esm/index.mjs' &&
    apiBaseModules.some((candidate) => path.resolve(candidate.root) === path.resolve(source.root))
  ) {
    const packageJson = packageJsonAt(target.root);
    if (packageJson.version !== REVIEWED_API_BASE_ZOD_VERSION) {
      throw new Error(
        `SECURITY_GATE: expected api-base Zod ${REVIEWED_API_BASE_ZOD_VERSION}, found ${packageJson.version}`,
      );
    }
    return;
  }
  throw new Error(`SECURITY_GATE: unreviewed Zod 3 consumer emitted: ${normalizeModuleId(sourceId)}`);
}

export function assertSafeBundle(bundle, getModuleInfo = undefined) {
  const apiBaseModules = [];
  const renderedModules = [];
  const emittedZodRuntimeIds = new Set();

  for (const [fileName, output] of Object.entries(bundle)) {
    if (output.type !== 'chunk') continue;
    if (!output.modules) {
      throw new Error(`SECURITY_GATE: missing rendered-module metadata for chunk ${fileName}`);
    }
    for (const [rawId, metadata] of Object.entries(output.modules)) {
      if (!isEmitted(metadata)) continue;
      const id = normalizeModuleId(rawId);
      const installedPackage = installedPackageFor(id);
      if (id.includes('node_modules/') && !installedPackage) {
        throw new Error(`SECURITY_GATE: cannot identify dependency owner for emitted module: ${id}`);
      }
      renderedModules.push(rawId);
      if (installedPackage?.name === '@privy-io/api-base') apiBaseModules.push(installedPackage);
      if (isVulnerableZodRuntime(installedPackage)) emittedZodRuntimeIds.add(normalizeModuleId(rawId));
      if (installedPackage?.name === 'uuid') {
        throw new Error(`SECURITY_GATE: unreviewed uuid implementation emitted: ${id}`);
      }
      if (
        installedPackage?.name === '@coinbase/cdp-sdk' ||
        installedPackage?.name === 'x402' ||
        installedPackage?.name === '@x402/core'
      ) {
        throw new Error(`SECURITY_GATE: unreviewed Coinbase CDP/x402 code emitted: ${id}`);
      }
      assertReviewedAppkitModule(installedPackage);
    }
  }

  for (const installedPackage of apiBaseModules) verifyApiBaseModule(installedPackage);
  if (renderedModules.length > 0 && typeof getModuleInfo !== 'function') {
    throw new Error('SECURITY_GATE: missing import graph for emitted dependency modules');
  }
  const visited = new Map();
  const visiting = new Set();
  function visit(rawSourceId) {
    const sourceId = normalizeModuleId(rawSourceId);
    if (visited.has(sourceId)) return visited.get(sourceId);
    if (visiting.has(sourceId)) return emittedZodRuntimeIds.has(sourceId);
    visiting.add(sourceId);

    const info = getModuleInfo(rawSourceId);
    if (!info) {
      if (sourceId === '\0rolldown/runtime.js' || sourceId.startsWith('node:')) {
        visiting.delete(sourceId);
        visited.set(sourceId, false);
        return false;
      }
      throw new Error(`SECURITY_GATE: missing import graph for reachable module: ${sourceId}`);
    }

    let reachesVulnerableZod = emittedZodRuntimeIds.has(sourceId);
    for (const targetId of [...(info.importedIds ?? []), ...(info.dynamicallyImportedIds ?? [])]) {
      const normalizedTargetId = normalizeModuleId(targetId);
      const targetReachesVulnerableZod =
        emittedZodRuntimeIds.has(normalizedTargetId) || visit(targetId);
      if (targetReachesVulnerableZod) {
        assertZodImportAllowed(rawSourceId, targetId, apiBaseModules);
        reachesVulnerableZod = true;
      }
    }

    visiting.delete(sourceId);
    visited.set(sourceId, reachesVulnerableZod);
    return reachesVulnerableZod;
  }
  for (const rawSourceId of renderedModules) {
    visit(rawSourceId);
  }
}

export function vulnerableRuntimeGuard() {
  return {
    name: 'mootz-vulnerable-runtime-guard',
    apply: 'build',
    generateBundle(_outputOptions, bundle) {
      assertSafeBundle(bundle, (id) => this.getModuleInfo(id));
    },
  };
}
