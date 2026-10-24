# Mootz backend

Approved organizer creation/check-in and finalized collection mapping are described
in [restricted organizer setup](../docs/organizer-events.md). Apply migration 020
and explicitly grant existing event owners before using the updated check-in API.

Status: backend, Meet/Event/frame APIs, relay workers and canonical contract exports are present. Client acceptance and public testnet deployment must be verified separately.

Available backend modules: identity/wallet/preferences, friendships, private paired-photo publication and Map/Feed, reactions/comments/streak, signed Meet validation and Dots, Event organizer check-in, collection authorizations/equip, explicit relay workers and offchain achievement frames. Local tests cover these modules; actual contract deployment, live transaction receipts, FE consumer acceptance and two-device integration remain outstanding. INT-01 and BE issues remain open; the implemented slices are on main; merge does not replace consumer acceptance.

## Local setup

For the prepared Linux VPS setup (separate from laptop Compose), see [deploy/vps/README.md](deploy/vps/README.md). It includes HTTPS, private database, migration ordering, backup and an isolated restore drill. `npm run test:deploy` validates the sanitized Compose model and requires Docker Compose, while ordinary unit tests do not require Docker.

Requires Node 24.13.0 or newer in the 24.x line, npm 11, and PostgreSQL with PostGIS. Dependencies and tooling are pinned in package.json/package-lock.json; no root or frontend workspace tooling is introduced.

From be/:

```powershell
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
# Start Docker Desktop first; this database is local development only.
docker compose up -d db
npm run db:migrate
npm run dev
```

On a fresh checkout and database, this is the clean-start path: the backend-local `.env.example` provides the localhost database URL and safe disabled worker defaults; `db:migrate` applies every pending migration in order, including `015_chain_sync.sql` and `016_chain_evidence_constraints.sql`. The API does not migrate or seed on startup. For a fully containerized local run, `docker compose up -d --build --wait` also starts only the API and database; the API image does not run migrations automatically, so run `docker compose run --rm api node dist/db/cli.js migrate` before using migrated routes. Do not delete an existing database volume to obtain a clean start.

The local database uses a named volume. Do not remove that volume to troubleshoot without reviewing its contents. The example password is for the localhost-bound development service only; set independent credentials for deployment.

Default API: http://localhost:3001. GET /health checks the process only. GET /ready queries PostGIS and returns 503 when the dependency fails. Health routes are public operational endpoints; no application data is served.

The database is exposed only on `127.0.0.1:55432` to avoid conflicting with another local PostgreSQL service. Copy the current example configuration when setting up the host API; do not reuse an older URL pointing at port 5432. Containers connect internally to `db:5432`.

To run both API and database with Docker: `docker compose up -d --build --wait`. The API runs as an unprivileged user and its container healthcheck checks `/ready`.

Configuration: DATABASE_URL and ALLOWED_ORIGINS are required. PORT defaults to 3001, HOST to 127.0.0.1, LOG_LEVEL to info. Origin entries must be exact HTTP/HTTPS origins without a trailing slash or path, comma-separated; wildcard origins are rejected. The server never accepts a client-provided request ID. CORS is not authentication. Keep .env private.

## Checks

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm audit --audit-level=low
npm start
```

`npm start` runs the built API and does not apply migrations. Build first, then apply pending migrations separately with `npm run db:migrate`.

Tests use HTTP injection, real local HTTP sockets, real PostgreSQL/PostGIS, synthetic decoded images and explicitly mocked provider adapters. A local HTTP fixture also exercises the actual Supabase SDK. They do not establish a live Supabase cloud integration. The coverage gate applies to selected service modules and does not certify the startup process or future features.

The database integration suite and combined coverage gate require a separate disposable PostgreSQL/PostGIS database. Create it once in the local service; do not reset the API database for tests. `npm test` runs unit tests without it:

```powershell
docker compose exec -T db psql -U mootz -d postgres -c "CREATE DATABASE mootz_frames_tests"
docker compose exec -T db psql -U mootz -d mootz_frames_tests -c "CREATE EXTENSION IF NOT EXISTS postgis"
$env:TEST_DATABASE_URL='postgresql://mootz:mootz_local_only@127.0.0.1:55432/mootz_frames_tests'
npm run test:db
npm run test:coverage
```

It fails before fixtures if the URL is absent or its database name does not end in `_tests`. PostgreSQL/PostGIS failure also fails the suite; checks are never silently skipped. Existing test databases should be reused without running CREATE DATABASE again. This naming guard does not authorize manual destructive SQL or migration-history resets.

## Identity and wallet setup

Set `PRIVY_APP_ID` and the app's SPKI `PRIVY_VERIFICATION_KEY` together in the private environment. Literal `\n` escapes in the public key are expanded. Without both, identity/wallet routes return 503 `AUTH_UNAVAILABLE`; there is no development authentication bypass. Invalid key material fails startup. Tokens must be ES256 with issuer `privy.io`, matching audience, valid issued-at/expiration and a Privy DID subject. Clients send `Authorization: Bearer <access token>`. A verified token establishes provider identity only; additional wallet/account claims are ignored.

Available endpoints: `GET /v1/me`, `PATCH /v1/me/preferences` with `{recordMeet:boolean}`, and `POST /v1/me/onboarding` with `{}`. Unknown body fields and coerced boolean strings are rejected. Preferences are persisted atomically with history; duplicate onboarding calls preserve the original completion timestamp. A preference change does not rewrite already signed Meet messages.

Wallet control: `POST /v1/me/wallet-challenges` with `{wallet}` returns `challengeId,message,wallet,expiresAt`. Sign that exact message, then `POST /v1/me/wallet-bindings` with `{challengeId,wallet,signature}`. The EOA proof expires after five minutes, is account/domain scoped, and is consumed atomically with binding. Five issues per minute and at most five outstanding challenges are allowed per authenticated subject. Replay, account change, another account's wallet and implicit active-wallet rotation are rejected. `WALLET_PROOF_DOMAIN` is server-owned; set it to the actual API's proof domain. `WALLET_CHAIN_ID` defaults to the planned Monad testnet namespace 10143. This generic wallet control signature is not RECORD_MEET consent or transaction authorization. Smart contract wallets, wallet rotation/recovery and an organizer ownership endpoint are not implemented.

Run `npm run db:seed` only for local development. It creates two explicitly synthetic accounts, their friendship and Demo Workshop A; they cannot log in via the production Privy verifier. Seed refuses NODE_ENV=production. Migrations run transactionally with an advisory lock and immutable checksums; editing an applied migration fails. Use a new migration file for changes. The Docker image includes migrations; use `docker compose run --rm api node dist/db/cli.js migrate` before running authenticated routes. Seed is opt-in and never runs on server startup.

## Private photo storage

Follow [Supabase setup](../docs/supabase-storage-setup.md). A private bucket and server credentials are required; the backend does not automatically create or change cloud resources. Set `SUPABASE_URL`, `SUPABASE_SECRET_KEY` and `SUPABASE_STORAGE_BUCKET` in private server configuration. Legacy `SUPABASE_SERVICE_ROLE_KEY` is accepted instead of the secret variable. Keep Supabase credentials out of FE and Git. `/ready/storage` checks bucket privacy separately from database readiness.

When Privy or storage configuration is absent, media APIs return 503 `MEDIA_UNAVAILABLE`. Public/missing/unreachable buckets fail closed. Draft creation, raw binary front/back upload, complete-pair publication, authorized detail/media access and keyset-paginated Feed/Map are implemented. The selected audience is currently the author and accepted friends; there is no public/event access grant or per-post recipient selector. JPEG/PNG inputs are normalized to metadata-free JPEG with thumbnails. Ordinary upload is create-only; `/v1/moments/:id/media/:side/retake` explicitly replaces one existing owned draft side without repeating the other. Published sides remain immutable. Real synthetic publication and owner/friend/outsider checks passed locally; see [media API handoff](../docs/interfaces.md) for routes and limits.

## Friendship, interactions, streak and Event slices

Authenticated friends requests require the target's existing backend account ID. Only the recipient accepts a pending request; crossing requests do not grant access. Removing a relationship prevents new media access immediately, but already issued signed URLs remain usable until their expiry. Blocked rows cannot be changed through these routes. No public discovery, contacts sync or block/unblock UI is implemented.

`GET /v1/me/streak` derives eligible complete capture publications from server publication days in Asia/Jakarta. Drafts and uploaded-source posts do not count, multiple posts in one day count once, and there are no rewards. Capture provenance is client-declared, not proof of camera use.

Reusable selfie uploads use the same private storage/normalization as moments, limited to five successful uploads per account per minute. Library deletion is soft: sent reactions retain their assets, and physical cleanup/retention remains pending. One reaction per account/moment is replaced or removed idempotently. Comments have one reply level, a500 Unicode character limit, author-only deletion and root tombstones retaining replies; all retained rows count toward the20/minute account limit. Reuse `clientRequestId` (UUID) on comment retries to return the existing comment without duplication; changing the payload under the same key returns409. Omitting the key creates a distinct comment. All interactions require the current published-moment audience.

Event list/details and own check-in status are authenticated. Only the event's already configured organizer account can check in an existing account within `[startsAt,endsAt)` using server time. Retry preserves the original check-in timestamp. There is no API granting organizer authority, no event CMS and no claim/signing or onchain ownership logic yet. Check-in does not prove physical attendance.

Public contracts are under `specs/friends.openapi.json`, `streak.openapi.json`, `comments.openapi.json`, `reactions.openapi.json` and `events.openapi.json`. These are backend handoff candidates; product-client acceptance and shared signing agreement remain outstanding.

## Meet, Dots and relay

Meet requires `MEET_RPC_URL` and `MEET_REGISTRY_ADDRESS` together, from a verified deployment. Startup checks chain10143, code,60/300 constants and the canonical Offer-domain hash. Absent configuration returns503 MEET_UNAVAILABLE while other APIs keep operating. Fixture addresses are not actual deployments. `npm run check:protocol` checks public types and ABI copies against SC.

Issue/sign an Offer for today's complete published capture moment, submit the poster's fresh foreground sample, then let a different bound wallet preview/sign Accept. Typed uint256 fields are JSON decimal strings; convert to bigint for viem. A slow wallet prompt consumes the fixed60-second window; never extend a signed expiry. Both signatures/current bindings/consent, event check-ins/window,100m distance,50m accuracy,15s sample age/5s future tolerance and atomic pair-area/day/maxfive rules apply. A matching retry returns the same Meet/Dot. Neither signatures nor GPS prove human uniqueness/presence.

Preview supplies scoped backend POST paths, not reusable provider URLs. Fetch JPEG bytes with scanner bearer auth and the same QR digest/signature, then use a local blob URL. Expiry is rechecked after private storage reads. No friendship or ordinary moment/media access is granted. Pending poster coordinates are cleared on acceptance and swept at startup/every15seconds while the API runs; a stopped service cannot clean them, so monitor retention before real usage.

Participants and current poster friends can read Dot metadata; scanner friends alone cannot. Map markers require location-sharing consent and use the generalized actual meeting area, not photo coordinates. Hidden markers remain counted; only their hider can restore them. See specs/meet.openapi.json and specs/dots.openapi.json.

The API never sends a transaction. Each worker is a separate one-shot command and is disabled by default; neither local Compose nor VPS Compose starts a worker. After build, `npm run relay:once` requires `RELAYER_ENABLED=true`, a dedicated server-only `RELAYER_PRIVATE_KEY`, verified roles/deployment and funding. Set the flag only in the private worker environment when deliberately running this sender; Compose deliberately keeps the relayer key out of the public API service.

The worker persists raw transaction/hash before broadcast and serializes the dedicated relayer account through PostgreSQL. An unresolved signed nonce blocks new transaction preparation. Readback must match the original signed Meet; outage, opt-out, deadline or transaction failure never removes a valid Dot. Read-only nonce inspection and finalized-receipt reconciliation are available as separate explicit commands; automatic replacement/cancellation remains unimplemented. Event claim submission has its own worker below. See specs/relay.md before scheduling a worker.

## Event collections

`GET /v1/events/:id/collection` reports eligibility and live contract balance/supply. `POST /v1/events/:id/claim-authorizations` accepts only a UUID `clientRequestId`; recipient comes from the authenticated account's active verified wallet. Organizer check-in is required. Tags, Meets and Dots do not grant eligibility. A successful response has `status: authorized`, not claimed or owned. A voucher lasts at most 120 seconds and never beyond the configured claim window. A matching retry returns the same unexpired authorization; a different key while one is pending returns `CLAIM_PENDING`.

Configure paired `EVENT_COLLECTION_RPC_URL` and `EVENT_COLLECTION_ADDRESS` only after Diaz supplies a verified Monad testnet deployment. Startup verifies chain/code and canonical EIP-712 hash. An optional dedicated server-only `EVENT_CLAIM_ISSUER_PRIVATE_KEY` enables local voucher signing and must hold the contract's issuer role. Without it, ownership/equip reads remain available and new authorizations fail closed. No live issuer key or deployment is supplied by the repository.

An operator must provision an `event_collections` mapping with the backend Event UUID, chain ID, contract address, actual onchain collection ID, claim window, display name and public HTTPS artwork. The contract collection's eventId must equal the canonical `uuidBytes32(event_id)` adapter. Do not put private media URLs in public artwork/contract metadata. No public route grants issuer/organizer roles or creates contract collections; no metadata URI is fetched by the backend.

`GET/PUT/DELETE /v1/me/equipped-collection` manages one Event collection frame. PUT accepts `collectionRef`, requires a positive current wallet balance onchain, and preserves the timestamp on retries. GET rechecks ownership, removes a confirmed stale equip, and preserves it on RPC errors. DELETE needs no chain connection. A signed voucher is never evidence of ownership. See `specs/collections.openapi.json`, `specs/equip.openapi.json` and `../docs/event-collections-handoff.md`.

`POST /v1/events/:id/claims` queues an existing own `{authorizationId}`. Matching retries return the same job. `GET /v1/events/:id/claims/:claimId` returns only that account's status, without requiring RPC connectivity. States are `pending`, `included`, `already_owned`, and `failed`; responses carry `finality: unverified|included|finalized` plus `chainOutcome`, based on exact-transaction observations from the separate chain worker. Without observations finality remains unverified. Included requires the exact successful receipt event plus ownership/nonce readback, and is provisional. An external claim can yield `already_owned`; neither state replaces the live ownership API.

After build, the separate `npm run claim-relay:once` command requires `CLAIM_RELAYER_ENABLED=true`, paired Event collection configuration and a funded dedicated `RELAYER_PRIVATE_KEY` distinct from the issuer. No claim sender starts with the API or either Compose setup. Set this flag only in the private worker environment when deliberately running the sender. EventCollection permits anyone to submit a valid voucher; its issuer must have `ISSUER_ROLE`. The relayer needs native gas, not a special EventCollection role. API voucher issuance and transaction sponsorship use separate keys.

The claim worker persists exact signed bytes/hash/sender before broadcast and shares the Meet worker's global PostgreSQL lock. Either queue's unresolved signed transaction blocks new nonce preparation in both. Gas is bounded at 1,000,000 units and RPC-estimated fees must fit the configurable policy (default 500 gwei max fee and 50 gwei priority, hard maxima 1000/100); exceeding bounds stops the attempt rather than changing the signed transaction. An expired voucher with an unresolved signed nonce stays pending for operator reconciliation. See `specs/claim-relay.md`; upgrade both workers and apply migration012 before enabling this queue.

Actual gas sponsorship/receipt verification and finality-worker acceptance on Monad, production replacement/cancellation procedures, Gathering B gate integration and the FE claim/equip experience remain acceptance work. This slice does not make the complete Event feature ready for acceptance.

## Chain indexing, finality and nonce diagnosis

Migrations `015_chain_sync.sql` and `016_chain_evidence_constraints.sql` add chain observations and their consistency constraints. `npm run db:migrate` applies them with all other pending migrations; on upgrade, apply migrations and build the matching API before exposing the new status fields. The authenticated Dot and claim status APIs join exact-transaction observations from the new table. See [chain sync](specs/chain-sync.md) for all environment names and interpretation.

- `npm run chain-sync:once` explicitly runs read-only finalized event indexing and Meet/claim receipt reconciliation. Configure `CHAIN_SYNC_ENABLED=true`, `CHAIN_SYNC_CHAIN_ID=10143`, its RPC, and the actual deployment block for each selected contract. It is disabled in `.env.example`, never runs with the API, and neither Compose setup starts it. It never needs a signing key.
- `npm run relay:inspect` provides sanitized queue, nonce, expiry and funding diagnosis. It does not mutate jobs or send transactions; follow [nonce recovery](specs/nonce-recovery.md).
- Both sender workers use separately configurable `MEET_RELAY_MAX_FEE_GWEI`/`MEET_RELAY_MAX_PRIORITY_FEE_GWEI` and `CLAIM_RELAY_MAX_FEE_GWEI`/`CLAIM_RELAY_MAX_PRIORITY_FEE_GWEI`. Defaults are500/50 whole gwei, hard maxima1000/100. Lower budgets only after saved signed transactions drain; never clear unresolved bytes to get around a budget.

Finality and execution outcome are separate. Require `finality=finalized` plus `chainOutcome=success` to call a record final; a finalized revert is a failure. A legacy `recorded`/`included` status without observations is provisional. Dots, audiences and private media remain offchain. Indexing never creates a Dot, and failed/reorganized transactions never remove one. Live deployment/provider acceptance, worker scheduling and monitoring remain operator work.

## Achievement frames

`GET /v1/me/frames` exposes the demo achievement inventory; `GET/PUT/DELETE /v1/me/frame` reads/equips/clears the shared active frame. First Meet1Dot, Together10Dots and Social Butterfly5 distinct current friend partners are labelled demo thresholds. Unlocks persist offchain and never depend on relay success. Event collection and achievement frames share one slot, and locked achievements cannot be equipped.

Profile and authorized moment/Map/Feed reads expose current `activeFrame` state; uncertain Event ownership returns unavailable. The FE supplies artwork for the returned assetKey identifiers. Read `../docs/frames-handoff.md` for policy and migration compatibility. Use a separate disposable database with PostGIS for tests, for example `mootz_frames_tests`; do not use the API's database for fixture resets.

## Container execution

```powershell
docker build -t mootz-backend:local .
docker run --rm --env-file .env -e HOST=0.0.0.0 -p 127.0.0.1:3001:3001 mootz-backend:local
```

For a container, DATABASE_URL must address a database reachable from that container; localhost is the container itself. Use the database service name on a shared Docker network, or your host's supported gateway. The image runs as the node user. Supply environment variables at runtime; .env is excluded from its build context. The container entrypoint reads environment directly. Host npm start reads be/.env.

Production TLS/reverse proxy, backups, migration policy, provider secrets, deployment, access controls and monitoring are not verified by this scaffold. Do not expose database port 5432 publicly.

## Handoff
