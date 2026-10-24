# Monad mainnet migration — 24 October 2026

Target: chain **143**, RPC `https://rpc.monad.xyz`. Verified addresses and deployment blocks are in `sc/abi/deployment.monad-mainnet.json`; the same addresses also exist on testnet, so chain ID is mandatory. Both receipt status and runtime bytecode hashes were reread successfully on mainnet during this migration.

Backend runtime must explicitly set `WALLET_CHAIN_ID=143`, both RPC variables to the mainnet RPC, and both verified contract addresses. The backend's legacy fallback remains 10143 for existing consumers; production Compose and env examples explicitly select 143. Apply `022_monad_mainnet.sql` before switching. It expands constraints without changing historical rows, wallet bindings, signatures, Dots or testnet receipts. Existing users must prove their wallet binding again on chain 143. Old QR Offers/vouchers are not re-signed or migrated. Existing event collection mappings remain on testnet and require a new reviewed mainnet collection; changing a database chain ID does not migrate an NFT.

Meet/claim transports, signing probes and read-only workers accept only configured Monad networks and reject mismatched RPC or signed transaction chain IDs. Workers select jobs by chain; historical testnet signed jobs remain intact. Index cursors, logs and finality queries use chain-scoped keys. Configure read-only sync with `CHAIN_SYNC_CHAIN_ID=143`, `CHAIN_SYNC_RPC_URL=https://rpc.monad.xyz`, Meet start block `116137305`, collection start block `116137308`; explicit worker enablement remains required. Transaction workers need funded, authorized keys; claim relayer and issuer must be distinct wallets.

## Frontend handoff

The user assigned Vercel deployment to their teammate. Deploy the updated frontend source with these production variables, then rebuild (Next.js public variables are bundled at build time):

```dotenv
NEXT_PUBLIC_MONAD_CHAIN_ID=143
NEXT_PUBLIC_MEET_REGISTRY_ADDRESS=0x6fcdc6f98ab1ead21ae44f1e57f1ffeb5d3a49ff
NEXT_PUBLIC_EVENT_COLLECTION_ADDRESS=0x3d368ee46756102b0e0567f846f5ad9fcdff8a01
NEXT_PUBLIC_API_BASE_URL=https://api.mootz.fun
```

Privy default/supported chain, wallet signing/switching, organizer reads and explorer links now share the selected network. Keep existing Privy configuration and disable fixture mode. Backend startup and contract receipt checks do not establish a completed two-device Meet/claim flow. Meet records disclose wallet pairs publicly; media, location and Dots remain offchain.

## Runtime cutover result

Cutover completed on 2026-10-24 at approximately 09:25 UTC. Live API image:
`mootz-backend:mainnet-20261024`, digest
`sha256:395b17a2504aee92c31d9050c3533fb7b63f328c7cb429d004ad394b51d87260`.
The image uses the previously running server source plus the scoped mainnet patch;
unrelated in-progress organizer location changes were excluded from this deployment.
Migration 022 completed. Live container health, database readiness and private
storage readiness all returned HTTP 200, and both contract signing-domain probes
passed against mainnet from the live API container.

Validation: Node 24 backend build/typecheck/lint, 256 unit tests and 153 PostgreSQL
integration tests passed on the VPS using disposable databases with PostGIS.
Frontend typecheck, 53 unit tests, lint and generated exports passed locally.
The frontend production build passed with `npm run build -- --webpack`;
Turbopack was unavailable here because its helper could not bind a port.

Server backup/config rollback and the sanitized source patch are retained privately
under `/home/ubuntu/.local/state/mootz-mainnet-20261024`; the database backup stays
in the server's existing backup directory. No database export or secret was copied
back to the local machine. The server checkout contains the deployed mainnet patch
as tracked local changes, so the existing auto-deployer intentionally refuses to
overwrite it. Reconcile the tested patch with the merged main branch before
restoring normal automatic deployment; do not reset these changes to testnet.
No transaction worker was enabled and no live Meet or collectible claim was sent
by this migration. Those flows and the teammate's Vercel deployment remain separate
acceptance steps.
