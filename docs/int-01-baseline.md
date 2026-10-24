# INT-01 v1 consumer baseline

Status: backend, Meet/Event/frame APIs, relay workers and canonical contract exports are present. Client acceptance and public testnet deployment must be verified separately.

## Modules and public configuration

| Module | Contract |
| --- | --- |
| be/ | Node24.13, TypeScript5.9, Fastify5, npm11 module-local lockfile. Docker PostgreSQL/PostGIS and API, private Supabase Storage. Scripts: lint/typecheck/test/test:db/test:coverage/build. API localhost3001. |
| fe/web/ | Wangsit's Next.js/TypeScript initial demo. Public API base localhost3001, public Privy App ID; browser origin localhost3000. Product manifest/lockfile/scripts and fresh-install acceptance are Wangsit-owned and currently absent. |
| fe/app/ | Mobile delivery deferred until after the initial web demo. No mobile framework/build or native background-location behavior is promised. Framework selection is a separate owner decision before mobile implementation. |
| sc/ | Diaz's Solidity0.8.30/Cancun/Foundry1.8.0 candidate with Monad execution; exact npm lockfile, public schema/helpers/ABI, typecheck and generated-artifact checks. Public deployment belongs to SC-03. |

No root workspace dependency install is defined. Run each module's npm ci from its own lockfile. Existing package-manager pins are module-local; do not rewrite another owner's lockfile just to match patch versions. Frontend consumes public artifacts and backend HTTP APIs, never be/src business code.

Backend runtime configuration stays server-only. Clients receive only API base, public Privy App ID, chain ID10143 and verified public deployment addresses when available. No Supabase server key, signing salt, issuer/relay secret, database URL or verification coordinates go into a public bundle or contract transaction. Each production client origin must be explicitly allowlisted in backend CORS and Privy before use. Local origin is http://localhost:3000; no cookie auth is enabled.

Privy bearer subject maps to stable backend account ID; a wallet is separately proven and bound by challenge. Client accountId/wallet never establishes actor identity. A wallet proof is not Meet consent. EOA-only protocol v1 excludes ERC-1271, passkey and delegated EIP-7702 accounts; actual undelegated-code checks are required before relay. Two wallets do not prove two humans.

## Canonical signing and distribution

Use sc/specs/typed-data.mjs as schema/helper source, its generated protocol.ts for TypeScript clients, vectors.json for independent checks and sc/abi/*.json for contract calls. Do not manually duplicate type field ordering. Backend's generated consumer copy is checked against the canonical export; run npm run check:protocol from be before publishing consumer changes.

Meet domain: MootzMeetRegistry, version1, actual chainId and verifyingContract. Collection domain: MootzEventCollection, version1, actual collection contract. No personal-sign wrapper. Signatures are65-byte low-s ECDSA. Fixture addresses in vectors are explicitly synthetic, not deployment metadata.

UUID IDs are raw16 bytes, right-padded with16 zero bytes to bytes32, no reversal or string hash. meetId and nonce are CSPRNG fresh per newly opened QR; poster-scoped nonce and Meet ID are consumed once. eventId zero means no event. Collection ID is a separate positive uint256 mapped to the event's encoded UUID.

Offer fields/order and Accept fields/order are exactly the generated SC types. Both action values are keccak256 of RECORD_MEET or OFFCHAIN_MEET UTF-8. Accept binds the complete domain-aware Offer digest. Opt-out keeps a valid offchain Meet/Dot; relay must never submit an opt-out message. Consent is evaluated from signed actions and the setting at signing, not rewritten by later preference changes.

Chain commitment v1 is keccak256(abi.encode(uint256(1),momentIdBytes32,frontSHA256,backSHA256,saltBytes32)). Hash the exact immutable normalized full-image bytes, front before back. Existing private moment salt is32 random bytes. Backend's internal historical SHA256 pair digest remains unchanged; the chain adapter derives the agreed keccak commitment from those immutable stored inputs. No API may substitute the internal pair digest for this chain commitment. Scoped QR preview must supply authorized full-image access and proof inputs so a scanner can verify the same bytes; those private inputs never enter calldata/logs.

## Acceptance time, event binding and relay

QR expires exactly60seconds after issuedAt. Backend must receive AND validate Accept strictly before expiresAt; at-expiry is rejected. Store trusted server acceptedAt using the same authoritative time source as publication/verification, not a client signature timestamp. Only one scanner can finalize a QR; race losers receive MEET_USED. Reserve pair+area+server-day and daily count atomically with valid Meet/Dot creation. A retry uses the same Meet ID/nonce and cannot award a second Dot.

The configured RELAYER_ROLE attests that backend performed signatures, current account-wallet bindings, foreground policy, pair limits and check-ins at acceptedAt. Contract enforces issuedAt <= acceptedAt < expiresAt, acceptedAt <= block time and submission at most300seconds after acceptedAt. This is explicit backend/relay trust: signatures alone cannot prove historical signing time. A compromised authorized relay can lie about time/eligibility but cannot forge participant signatures or turn opt-out into opt-in.

An event-tagged Offer keeps its eventId immutable even before the scanner is known. At Accept, backend verifies BOTH current check-ins during that event and rejects a missing check-in; never strip/change the signed event ID to make it succeed. Claim issuer checks eligibility separately, signs recipient-bound vouchers and rechecks live role/supply/duplicate state. Claim failures never remove a Dot or fabricate ownership.

Use receipt plus contract readback before recorded/claimed success. AlreadyRecorded is reconciled against the existing matching record; an RPC error is not zero ownership. Stop relay retries beyond300seconds and keep Dot state with Not saved onchain. Organizer B independently proves wallet control and reads EventCollection.balanceOf and MeetRegistry.eventMeetCount directly from the exported ABI; no inventory DB substitutes those reads.

## Foreground-location policy v1

Backend helper: be/src/meet/location-policy.ts; this is a testable policy, not an implemented Meet route or live-location service.

Both samples require finite valid coordinates, positive reported accuracy at most50m, integer millisecond capture time and age at most15seconds relative to authoritative acceptance time. Permit at most5seconds of future skew. Haversine distance on sphere radius6371008.8m must be at most100m, inclusive, before assigning an area.

Assign the spherical midpoint to a nominal200m cell. Latitude row count is ceil(pi*R/200); row=floor((latitude+90)/180*rows), clamped at poles. At row center, longitude cell count=max(1,ceil(2*pi*R*cos(centerLatitude)/200)); column=floor((normalizedLongitude+180)/360*columns). Exact geographic poles always use column0 because longitude describes the same physical point there. Key is meet-area-v1:row:column. Normalize longitude to [-180,180). Participant order does not change the key. This is a discrete rate-limit area with boundary effects, not a guarantee that points closer than200m share a cell. Map display circles/grids are independent.

Canonical pair is sorted backend account IDs. Unique(pair,areaKey,serverDay); at mostfive successful Meets per pair per server day. Day is Asia/Jakarta,00:00 WIB. Hash/store area keys privately; precise coordinates remain offchain, never in Map/Feed, QR or contract payloads. Runtime work must remove foreground samples after validation rather than create a movement history. Any durable retention needs an explicit separate policy and deletion mechanism. No live sharing/background tracking is authorized by this baseline.

## API status contract

Existing routes remain described by be/specs/*.openapi.json. Implemented Meet paths/schemas and detailed errors are in meet.openapi.json. Their runtime requires the configured verified registry; no live deployment is supplied. Responses retain x-request-id, Cache-Control:no-store and structured error.code/requestId.

| HTTP | Meet error | Meaning |
| --- | --- | --- |
|400|INVALID_REQUEST / INVALID_SIGNATURE / INVALID_LOCATION|Malformed or mismatched signed input or sample.|
|401|UNAUTHORIZED|Missing/invalid bearer token; renew login rather than assume a wallet is identity.|
|403|WALLET_REQUIRED / WALLET_UNSUPPORTED / CHECK_IN_REQUIRED|Binding/wallet/check-in prerequisite failed.|
|404|NOT_FOUND|Moment/offer absent or scoped access denied; never leak another private moment.|
|409|MEET_USED / MEET_AREA_USED / MEET_DAILY_LIMIT / CONSENT_CHANGED|Session consumed, pair-area/day limit, or action needs fresh signing.|
|410|MEET_EXPIRED|Server received/validated at or after QR expiry.|
|422|LOCATION_ACCURACY / LOCATION_STALE / MEET_DISTANCE|Sample or distance policy failed; obtain a new foreground sample.|
|429|RATE_LIMITED|Throttle; do not create a new nonce to bypass pair rules.|
|503|DEPENDENCY_UNAVAILABLE|Storage/DB/RPC/provider unavailable; preserve already-valid offchain state.|

Dot validity and chain state are separate. Client states distinguish draft/published, QR active/expired, awaiting signature, location failure, valid Meet/Dot and onchain pending/recorded/not-saved. No private opt-out attribution is exposed. Event detail/check-in, eligibility, free claim and equip remain the full scope; backend routes exist for these slices; live deployment and product-client acceptance remain unverified.
