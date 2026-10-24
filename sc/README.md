# Mootz smart contracts

Owner: Diaz (@amantajatii).

**Contract sources and tests are included. Public Monad deployment is not configured.** MeetRegistry and EventCollection implement the [candidate INT-01 signing protocol](specs/README.md). Consumer acceptance and public deployment verification remain required. Do not treat local addresses as public contracts.

| Contract | Behavior |
| --- | --- |
| MeetRegistry | Two distinct EOA signatures, both RECORD_MEET; Accept binds full Offer digest; authorized backend relay attests acceptance before QR expiry; atomic Meet ID/nonce consumption and wallet/event counts |
| EventCollection | ERC1155 recipient-bound issuer voucher, one claim per wallet/collection, immutable cap and public metadata; no transfers, admin mint, burn, upgrade, or Meet-triggered mint |

No Dots token. Photo/location/audience/eligibility remain backend responsibilities. Signatures do not prove GPS, authenticity, signing time or unique humans. Public records expose wallet pairs; opt-out and failed chain records must not remove Dots.

## Reproduce

Tooling: Foundry **v1.5.1** (`.foundry-version`), Solidity **0.8.30**, EVM **Cancun**, optimizer 200. JS tooling npm **11.19.0**, Node >=24 <27. Dependencies OpenZeppelin Contracts 5.6.1, viem 2.57.10 and TypeScript 5.9.3 are exact-pinned with npm lockfile.

```sh
cd sc
npm ci --ignore-scripts
npm test
npm run lint
npm run build
npm run typecheck
npm run check:artifacts
npm audit
npm run smoke:local
```

`smoke:local` starts and stops its own loopback Anvil node with disposable, explicitly public test keys. It runs the deployment script, checks roles/code/digests, sends a valid Meet and claim, tests 51 concurrent claims against cap50, rejects unauthorized/opt-out/replay/recipient substitution/transfer, and rereads ownership and event count with an independent RPC client. It is **not a Monad fork or remote testnet check**, despite using chain ID10143 to exercise the deployment guard. Never fund these public fixture keys on a real network.

Local Ethereum EVM tests do not establish Monad gas/finality compatibility. Current [Monad guidance](https://docs.monad.xyz/developer-essentials/differences) recommends Foundry1.8+ with Monad execution enabled; the available pinned1.5.1 toolchain here does not provide that verification. Before actual deployment, deliberately upgrade/verify a Monad-enabled toolchain and rerun all checks rather than silently changing the team's global installation.

## Signing and consumer exports

- [specs/typed-data.mjs](specs/typed-data.mjs): canonical candidate definitions, domain helpers, UUID conversion and commitment helper.
- [specs/protocol.ts](specs/protocol.ts): generated TypeScript message types and literal viem schemas.
- [specs/vectors.json](specs/vectors.json): public synthetic RECORD_MEET/OFFCHAIN_MEET and claim vectors.
- [abi/MeetRegistry.json](abi/MeetRegistry.json), [abi/EventCollection.json](abi/EventCollection.json): generated ABIs; `npm run export` after a build.
- [abi/deployment.template.json](abi/deployment.template.json): explicitly empty testnet address/role/receipt handoff. Fill a separate deployment record only from verified public receipts.

`npm run vectors` regenerates vectors; `npm run check:artifacts` detects stale ABI, types or vectors. Solidity `VectorsTest` reproduces full EIP-712 hashes/signers and commitment encoding. Current backend pair commitment is a different internal SHA256 construction: integration requires explicit INT-01 agreement/adaptation; no live compatibility is claimed.

## Deployment preparation (not executed on testnet)

Use a funded encrypted Foundry keystore, explicit public role addresses and a verified Monad testnet RPC. Never pass keys on the command line or commit them. The script reads public role addresses only; it rejects chain IDs other than10143 and deploys contracts without granting the deployer implicit privileges. Admin controls role rotation and collection creation; issuer/relay are separate operational roles. Public metadata is reviewed manually. No pause, proxy, upgrade or historical Meet deletion exists.

From `sc/`, after INT-01 approval and the required toolchain/network checks:

```sh
# Set MOOTZ_ADMIN_ADDRESS, MOOTZ_RELAYER_ADDRESS, MOOTZ_ISSUER_ADDRESS,
# MONAD_TESTNET_RPC_URL and DEPLOYER_ADDRESS locally to reviewed public/config values.
# Replace mootz-deployer with your funded encrypted Foundry account name.
cast chain-id --rpc-url "$MONAD_TESTNET_RPC_URL"
forge script script/Deploy.s.sol:Deploy --rpc-url "$MONAD_TESTNET_RPC_URL" \
  --account mootz-deployer --sender "$DEPLOYER_ADDRESS"
# Review simulation, addresses, roles, gas and network, then explicitly broadcast:
forge script script/Deploy.s.sol:Deploy --rpc-url "$MONAD_TESTNET_RPC_URL" \
  --account mootz-deployer --sender "$DEPLOYER_ADDRESS" --broadcast
```

Admin then calls `createCollection(1,eventId,50,reviewedPublicMetadataURI)`. The deployer need not be admin and cannot configure a collection unless explicitly assigned that role. Receipt/code/role checks, explorer source verification, actual two-wallet Meet/claim smoke and independent count/ownership reads are required before SC-03 is complete. Record chain, addresses, commit, transactions, hashes and privileges in a sanitized deployment record. Raw `broadcast/` stays ignored.

Configure and verify the target network, funded deployment account and public role addresses before deployment. Run tests and audit separately; passing them does not establish a comprehensive security audit.
