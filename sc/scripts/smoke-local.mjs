import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:net';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createPublicClient, createWalletClient, defineChain, http, hashTypedData, keccak256, stringToHex, zeroHash } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { meetTypes, claimTypes, meetDomain, collectionDomain, RECORD_MEET, OFFCHAIN_MEET, protocolStatus } from '../specs/typed-data.mjs';

const run = promisify(execFile);
const root = fileURLToPath(new URL('..', import.meta.url));
const listener = createServer();
await new Promise((resolve, reject) => { listener.once('error', reject); listener.listen(0, '127.0.0.1', resolve); });
const port = listener.address().port;
await new Promise((resolve) => listener.close(resolve));
// This script starts its OWN loopback chain. No external RPC or secret environment input is accepted.
const chain = defineChain({ id: 10143, name: 'Local Anvil fixture, NOT Monad', nativeCurrency: { name: 'Test', symbol: 'TEST', decimals: 18 }, rpcUrls: { default: { http: [`http://127.0.0.1:${port}`] } } });
const rpc = chain.rpcUrls.default.http[0];
const anvil = spawn('anvil', ['--host', '127.0.0.1', '--port', String(port), '--chain-id', '10143', '--accounts', '0', '--timestamp', '1800000000', '--silent'], { stdio: 'ignore' });
let exited = false;
anvil.once('exit', () => { exited = true; });
anvil.once('error', () => { exited = true; });
const client = createPublicClient({ chain, transport: http(rpc, { retryCount: 0 }) });
// Deliberately public tiny test keys, only funded on this script's disposable local node.
const acct = (n) => privateKeyToAccount(`0x${n.toString(16).padStart(64, '0')}`);
const deployer = acct(1), admin = acct(2), relayer = acct(3), issuer = acct(4), poster = acct(5), scanner = acct(6);
const wallet = (account) => createWalletClient({ account, chain, transport: http(rpc) });
const hash = (text) => keccak256(stringToHex(text));
const report = { environment: 'LOCAL_DISPOSABLE_ANVIL_NOT_MONAD', protocolStatus, chainId: 10143, roles: { deployer: deployer.address, admin: admin.address, relayer: relayer.address, issuer: issuer.address }, transactions: [], checks: [] };
async function receipt(hash, label) {
  const r = await client.waitForTransactionReceipt({ hash });
  assert.equal(r.status, 'success', label);
  report.transactions.push({ label, hash, blockNumber: String(r.blockNumber), status: r.status });
  return r;
}
async function mustReject(label, fn) {
  // viem performs eth_estimateGas before send; a revert must leave state unchanged.
  await assert.rejects(fn); report.checks.push({ label, status: 'PASS' });
}
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (exited) throw new Error('Anvil could not start');
    try { if (await client.getChainId() === 10143) { ready = true; break; } } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.ok(ready, 'local node ready');
  for (const account of [deployer, admin, relayer, issuer, poster, scanner]) {
    await client.request({ method: 'anvil_setBalance', params: [account.address, '0x56bc75e2d63100000'] });
  }
  await client.request({ method: 'anvil_impersonateAccount', params: [deployer.address] });
  await run('forge', ['script', 'script/Deploy.s.sol:Deploy', '--rpc-url', rpc, '--unlocked', '--sender', deployer.address, '--broadcast'], {
    cwd: root, env: { ...process.env, MOOTZ_ADMIN_ADDRESS: admin.address, MOOTZ_RELAYER_ADDRESS: relayer.address, MOOTZ_ISSUER_ADDRESS: issuer.address }, maxBuffer: 4_000_000,
  });
  await client.request({ method: 'anvil_stopImpersonatingAccount', params: [deployer.address] });
  const deployment = JSON.parse(readFileSync(`${root}/broadcast/Deploy.s.sol/10143/run-latest.json`));
  const find = (name) => deployment.transactions.find((tx) => tx.contractName === name && tx.transactionType === 'CREATE');
  const registry = find('MeetRegistry').contractAddress;
  const collection = find('EventCollection').contractAddress;
  for (const name of ['MeetRegistry', 'EventCollection']) await receipt(find(name).hash, `deploy ${name}`);
  assert.ok((await client.getCode({ address: registry })).length > 2);
  assert.ok((await client.getCode({ address: collection })).length > 2);
  const meetABI = JSON.parse(readFileSync(`${root}/abi/MeetRegistry.json`));
  const collectionABI = JSON.parse(readFileSync(`${root}/abi/EventCollection.json`));
  const readMeet = (functionName, args) => client.readContract({ address: registry, abi: meetABI, functionName, args });
  const readCollection = (functionName, args) => client.readContract({ address: collection, abi: collectionABI, functionName, args });
  const relayRole = await readMeet('RELAYER_ROLE');
  assert.equal(await readMeet('hasRole', [relayRole, relayer.address]), true);
  assert.equal(await readMeet('hasRole', [zeroHash, deployer.address]), false);
  assert.equal(await readCollection('hasRole', [hash('ISSUER_ROLE'), issuer.address]), true);
  const eventId = hash('SYNTHETIC PUBLIC WORKSHOP A');
  const now = (await client.getBlock()).timestamp;
  const offer = { action: RECORD_MEET, meetId: hash('local-meet-1'), momentId: hash('local-moment-1'), photoCommitment: hash('SYNTHETIC SALTED COMMITMENT'), poster: poster.address, nonce: hash('offer-nonce'), issuedAt: now, expiresAt: now + 60n, eventId };
  const domain = meetDomain(10143, registry);
  const offerData = { domain, types: meetTypes, primaryType: 'MeetOffer', message: offer };
  const offerDigest = hashTypedData(offerData);
  assert.equal(await readMeet('hashOffer', [offer]), offerDigest);
  const accept = { action: RECORD_MEET, offerDigest, scanner: scanner.address };
  const offerSignature = await poster.signTypedData(offerData);
  const acceptSignature = await scanner.signTypedData({ domain, types: meetTypes, primaryType: 'MeetAccept', message: accept });
  const params = { address: registry, abi: meetABI, functionName: 'recordMeet', args: [offer, accept, offerSignature, acceptSignature, now] };
  await mustReject('unauthorized relay rejected', () => wallet(scanner).writeContract(params));
  const optOut = { ...accept, action: OFFCHAIN_MEET };
  const optOutSignature = await scanner.signTypedData({ domain, types: meetTypes, primaryType: 'MeetAccept', message: optOut });
  await mustReject('OFFCHAIN_MEET rejected', () => wallet(relayer).writeContract({ ...params, args: [offer, optOut, offerSignature, optOutSignature, now] }));
  await receipt(await wallet(relayer).writeContract(params), 'valid Meet');
  await mustReject('Meet replay rejected', () => wallet(relayer).writeContract(params));
  assert.equal(await readMeet('meetCount', [poster.address]), 1n);
  assert.equal(await readMeet('meetCount', [scanner.address]), 1n);
  assert.equal(await readMeet('eventMeetCount', [poster.address, eventId]), 1n);
  await receipt(await wallet(admin).writeContract({ address: collection, abi: collectionABI, functionName: 'createCollection', args: [1n, eventId, 50n, 'ipfs://SYNTHETIC-PUBLIC-DEMO-METADATA'] }), 'configure capped collection');
  const voucher = { collectionId: 1n, recipient: poster.address, issuer: issuer.address, nonce: hash('claim-nonce'), deadline: now + 300n };
  const voucherSignature = await issuer.signTypedData({ domain: collectionDomain(10143, collection), types: claimTypes, primaryType: 'Claim', message: voucher });
  const claimParams = { address: collection, abi: collectionABI, functionName: 'claim', args: [voucher, voucherSignature] };
  await mustReject('recipient substitution rejected', () => wallet(relayer).writeContract({ ...claimParams, args: [{ ...voucher, recipient: scanner.address }, voucherSignature] }));
  await receipt(await wallet(relayer).writeContract(claimParams), 'eligible collection claim');
  await mustReject('duplicate claim rejected', () => wallet(relayer).writeContract(claimParams));
  await mustReject('nontransferable ownership', () => wallet(poster).writeContract({ address: collection, abi: collectionABI, functionName: 'safeTransferFrom', args: [poster.address, scanner.address, 1n, 1n, '0x'] }));
  assert.equal(await readCollection('balanceOf', [poster.address, 1n]), 1n);
  assert.equal(await readCollection('totalSupply', [1n]), 1n);
  // Check readback with a second public client and no backend/database.
  const independent = createPublicClient({ chain, transport: http(rpc) });
  const ownership = await independent.readContract({ address: collection, abi: collectionABI, functionName: 'balanceOf', args: [poster.address, 1n] });
  const count = await independent.readContract({ address: registry, abi: meetABI, functionName: 'eventMeetCount', args: [poster.address, eventId] });
  assert.equal(ownership, 1n); assert.equal(count, 1n);
  // Submit 51 distinct, valid vouchers concurrently into one local block for a cap of 50.
  await receipt(await wallet(admin).writeContract({ address: collection, abi: collectionABI, functionName: 'createCollection', args: [2n, hash('SYNTHETIC CONCURRENT CAP TEST'), 50n, 'ipfs://SYNTHETIC-CAP-TEST'] }), 'configure concurrent cap test');
  const firstNonce = await client.getTransactionCount({ address: relayer.address, blockTag: 'pending' });
  await client.request({ method: 'evm_setAutomine', params: [false] });
  const deadline = (await client.getBlock()).timestamp + 300n;
  const pending = await Promise.all(Array.from({ length: 51 }, async (_, i) => {
    const concurrentVoucher = { collectionId: 2n, recipient: acct(1000 + i).address, issuer: issuer.address, nonce: hash(`concurrent-${i}`), deadline };
    const concurrentSignature = await issuer.signTypedData({ domain: collectionDomain(10143, collection), types: claimTypes, primaryType: 'Claim', message: concurrentVoucher });
    return wallet(relayer).writeContract({ address: collection, abi: collectionABI, functionName: 'claim', args: [concurrentVoucher, concurrentSignature], gas: 300000n, nonce: firstNonce + i });
  }));
  await client.request({ method: 'evm_mine', params: [] });
  await client.request({ method: 'evm_setAutomine', params: [true] });
  const concurrentReceipts = await Promise.all(pending.map((hash) => client.waitForTransactionReceipt({ hash })));
  assert.equal(concurrentReceipts.filter((r) => r.status === 'success').length, 50);
  assert.equal(concurrentReceipts.filter((r) => r.status === 'reverted').length, 1);
  assert.equal(new Set(concurrentReceipts.map((r) => String(r.blockNumber))).size, 1);
  assert.equal(await readCollection('totalSupply', [2n]), 50n);
  report.concurrentCap = { submitted: 51, successful: 50, reverted: 1, supply: '50', cap: '50', sameBlock: true, receipts: concurrentReceipts.map((r) => ({ hash: r.transactionHash, status: r.status, blockNumber: String(r.blockNumber) })) };
  report.checks.push({ label: '51 concurrent claims in one block cannot exceed cap 50', status: 'PASS' });
  report.runtimeBytecodeHashes = { registry: keccak256(await client.getCode({ address: registry })), collection: keccak256(await client.getCode({ address: collection })) };
  report.addresses = { registry, collection };
  report.readback = { poster: poster.address, scanner: scanner.address, eventId, ownership: String(ownership), eventMeetCount: String(count), totalSupply: '1', cap: '50' };
  report.checks.push({ label: 'deployment code, roles, digest, receipts and independent RPC reads', status: 'PASS' });
  mkdirSync(`${root}/evidence`, { recursive: true });
  writeFileSync(`${root}/evidence/local-smoke.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(`PASS: ${report.transactions.length} local successful receipts; ${report.checks.length} checks. NOT Monad testnet.`);
} finally {
  anvil.kill('SIGTERM');
  await new Promise((resolve) => { if (exited) resolve(); else anvil.once('exit', resolve); });
}
