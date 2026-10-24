# Mootz smart contracts

Owner: Diaz (@amantajatii).

**Both contracts are deployed on Monad testnet (chain 10143) and source-verified on Monadscan.** MeetRegistry and EventCollection implement the [candidate INT-01 signing protocol](specs/README.md). Consumer acceptance and public two-wallet Meet/claim smoke remain unverified.

| Contract | Behavior |
| --- | --- |
| MeetRegistry | Two distinct EOA signatures, both RECORD_MEET; Accept binds full Offer digest; authorized backend relay attests acceptance before QR expiry; atomic Meet ID/nonce consumption and wallet/event counts |
| EventCollection | ERC1155 recipient-bound issuer voucher, one claim per wallet/collection, immutable cap and public metadata; no transfers, admin mint, burn, upgrade, or Meet-triggered mint |

No Dots token. Photo/location/audience/eligibility remain backend responsibilities. Signatures do not prove GPS, authenticity, signing time or unique humans. Public records expose wallet pairs; opt-out and failed chain records must not remove Dots.

## Public testnet deployment

Deployed 2026-10-24 from commit `f0a966dfe9adbfb8f4a8f59b742e9f53f3cdfe27`. Public receipts, constructor arguments, runtime hashes and verification responses are recorded in [deployment.monad-testnet.json](abi/deployment.monad-testnet.json).

| Contract | Monadscan verified source |
| --- | --- |
| MeetRegistry | [0x6fcdc6f98ab1ead21ae44f1e57f1ffeb5d3a49ff](https://testnet.monadscan.com/address/0x6fcdc6f98ab1ead21ae44f1e57f1ffeb5d3a49ff#code) |
| EventCollection | [0x3d368ee46756102b0e0567f846f5ad9fcdff8a01](https://testnet.monadscan.com/address/0x3d368ee46756102b0e0567f846f5ad9fcdff8a01#code) |

Deployment receipts, runtime bytecode hashes and roles were independently reread through the public testnet RPC. Monadscan returned `Pass - Verified`; MonadVision returned a partial match through the monskills verification API. Actual deployment fees totaled **0.40790004 MON**.

The approved testnet configuration assigns admin, relayer and issuer to deployer `0x1B6A8259fB8aB197ee27F45788f14D77B35301f9`. These are distinct roles held by one wallet; operational separation has not been performed. No demo collection, public Meet or claim was created by this deployment. INT-01 remains a candidate; deployment is not evidence of full product integration or completion of SC-03.

## Reproduce

Tooling: Foundry **v1.8.0** (`.foundry-version`), Monad execution (`network = "monad"`), Solidity **0.8.30**, compiler target **Cancun**, optimizer 200. JS tooling npm **11.19.0**, Node >=24 <27. Dependencies OpenZeppelin Contracts 5.6.1, viem 2.57.10 and TypeScript 5.9.3 are exact-pinned with npm lockfile.

Ensure both `forge --version` and `anvil --version` resolve to v1.8.0 before running these scripts. The version file does not switch your shell's PATH automatically; a separate toolchain directory can be prepended without replacing the global installation.

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

`smoke:local` starts and stops its own loopback Anvil node with `--network monad` and disposable, explicitly public test keys. It runs the deployment script, checks roles/code/digests, sends a valid Meet and claim, tests 51 concurrent claims against cap50 using RPC gas estimates with a 10% buffer, rejects unauthorized/opt-out/replay/recipient substitution/transfer, and rereads ownership and event count with an independent RPC client. It is **not a Monad fork or remote testnet check**, despite using chain ID10143 to exercise the deployment guard. Never fund these public fixture keys on a real network.

Follow the [official Foundry guidance](https://docs.monad.xyz/tooling-and-infra/toolkits/foundry) and use v1.8.0 for Forge and Anvil. Local Monad execution exercises Monad rules and gas accounting, but does not establish live network gas estimates, consensus or finality. Remote testnet simulation and receipt/readback checks remain required before claiming public deployment.

## Signing and consumer exports

- [specs/typed-data.mjs](specs/typed-data.mjs): canonical candidate definitions, domain helpers, UUID conversion and commitment helper.
- [specs/protocol.ts](specs/protocol.ts): generated TypeScript message types and literal viem schemas.
- [specs/vectors.json](specs/vectors.json): public synthetic RECORD_MEET/OFFCHAIN_MEET and claim vectors.
- [abi/MeetRegistry.json](abi/MeetRegistry.json), [abi/EventCollection.json](abi/EventCollection.json): generated ABIs; `npm run export` after a build.
- [abi/deployment.template.json](abi/deployment.template.json): explicitly empty testnet address/role/receipt handoff. Fill a separate deployment record only from verified public receipts.

`npm run vectors` regenerates vectors; `npm run check:artifacts` detects stale ABI, types or vectors. Solidity `VectorsTest` reproduces full EIP-712 hashes/signers and commitment encoding. Backend `storedPhotoCommitment` adapts private stored media digests to the canonical chain commitment; the internal SHA256 pair commitment remains separate. INT-01 consumer approval and live compatibility checks remain required.

## Future deployment procedure

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
