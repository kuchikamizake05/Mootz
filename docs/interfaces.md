# Backend interfaces — foundation handoff

Public contracts: [integration baseline](int-01-baseline.md), [Meet API](../be/specs/meet.openapi.json) and [Dots API](../be/specs/dots.openapi.json). Product frontend acceptance and live deployment remain pending.

Preview returns scoped backend POST media paths, image hashes, private proof salt and Accept typed data. Fetch JPEG bytes using scanner bearer auth plus the original QR digest/signature; no provider signed URL is exposed. Current scope and expiry are checked after asynchronous reads. Dots expose authorized metadata and generalized meeting-area coordinates only when location was shared. [Relay recovery](../be/specs/relay.md) documents nonce blocking and remaining operational limits.

Status: backend API, protocol adapters and canonical contract exports are available. Run module checks and verify each consumer before deployment.

## Available now

API development origin: `http://localhost:3001`. Start instructions and required environment are in [be/README.md](../be/README.md). Public operational schema: [health.openapi.json](../be/specs/health.openapi.json).

- `GET /health`: 200 `{"status":"ok"}` means the process is serving requests.
- `GET /ready`: 200 `{"status":"ready"}` only after a successful PostgreSQL/PostGIS probe; 503 with `DEPENDENCY_UNAVAILABLE` otherwise. This does not check pending migrations, storage, chain RPC or provider credentials.
- Each response has a generated `x-request-id`; inbound request IDs are ignored. Responses use `Cache-Control: no-store`.
- Errors use `{"error":{"code":"NOT_FOUND","requestId":"generated UUID"}}`. Codes currently implemented: `NOT_FOUND` (404), `ORIGIN_NOT_ALLOWED` (403), `INVALID_REQUEST` (parser/client errors), `INTERNAL_ERROR` (500), `DEPENDENCY_UNAVAILABLE` (503).
- Explicit origins come from `ALLOWED_ORIGINS`. Requests with an unapproved Origin return 403. Origin-less requests are supported for server clients; CORS is not authentication. Cookie authentication is not enabled.

## Identity slice available for review

All `/v1/me` routes require a verified Privy bearer token; account IDs and wallets in token extra claims are ignored. Without server provider configuration, routes fail closed with 503 `AUTH_UNAVAILABLE`. Missing/invalid tokens return 401 `UNAUTHORIZED`. Unknown body fields are rejected.

| Route | Body | Result |
| --- | --- | --- |
| GET /v1/me | none | `{id,recordMeet,onboardingCompletedAt,wallet,username}`; wallet is verified lowercase address or null; username is the unique lowercase @handle or null |
| PATCH /v1/me/preferences | `{recordMeet:boolean}` | Updated own profile; actual value changes recorded atomically |
| PUT /v1/me/username | `{username:string}` | Own profile. Trimmed/lowercased, `^[a-z0-9_]{3,20}$`, reserved names rejected (400 `INVALID_USERNAME`); taken is 409 `USERNAME_TAKEN`; repeating own username is 200 |
| POST /v1/me/onboarding | `{}` | Own profile; completion timestamp is idempotent |
| POST /v1/me/wallet-challenges | `{wallet:string}` | `{challengeId,wallet,message,expiresAt}` |
| POST /v1/me/wallet-bindings | `{challengeId,wallet,signature}` | `{wallet,chainId}` after EOA proof and atomic binding |

Wallet proof expires after five minutes; client signs the exact returned message. `CONFLICT` (409) rejects another account's wallet or implicit wallet rotation; `RATE_LIMITED` (429) rejects more than five challenges/minute or five outstanding. Replay/account/domain/expiry/signature failures return 400 `INVALID_REQUEST`. This is a server-configured EVM wallet-control proof, not Meet consent. Contract wallets and recovery/rotation are not supported. See [backend README](../be/README.md) and identity evidence.

## Private media slice available for review

Supabase private Storage is the approved photo provider. App PostgreSQL remains local/VPS-managed. Server-only credentials are optional until provisioned; absent Privy/storage configuration returns 503 `MEDIA_UNAVAILABLE`. `/ready/storage` checks bucket privacy independently of `/ready` (database).

| Route | Input | Result |
| --- | --- | --- |
| POST /v1/moments | `{source:"capture"|"upload",caption?,eventId?,location?:{latitude,longitude}}` | 201 own private draft |
| PUT /v1/moments/{id}/media/{front\|back} | Raw JPEG/PNG bytes; matching Content-Type; <=8 MiB | `{side,status:"ready"}` |
| PUT /v1/moments/{id}/media/{front\|back}/retake | Raw JPEG/PNG replacing an existing owned draft side | `{side,status:"ready"}`; other side preserved |
| POST /v1/moments/{id}/publish | `{}` | `{id,status:"published"}`; repeat request preserves snapshot |
| GET /v1/moments/{id} | Bearer token | Authorized draft/published metadata and signed thumbnails |
| GET /v1/moments/{id}/media/{front\|back} | Bearer token | `{url,expiresIn:60}` after audience check |
| GET /v1/feed | `limit=1..50`, optional `cursor,filter=all\|friends\|events,eventId` | `{items,nextCursor}` |
| GET /v1/map | Same query | Authorized located items only; same moment IDs |

Draft/upload access is author-only. Published access is author plus currently accepted friends; no per-post recipient subset exists yet. Event tags never grant audience. Unauthorized detail/media reads return404. Ordinary uploads remain create-only; explicit retake replaces one existing draft side and preserves the other. Published sides remain immutable. Incomplete pairs and duplicate ordinary uploads return409. The `source` label is a client provenance declaration, not proof of capture.

Response metadata: `id,authorId,source,caption,eventId,publishedAt,createdAt,location,thumbnails`. `thumbnails` maps available sides to signed URLs. No object keys, salts, raw verification coordinates or media digests are exposed. Signed URLs can be used by anyone possessing them until expiry (at most60 seconds); friendship changes prevent new issuance. Feed cursors are opaque server-issued keyset tokens, not authorization.

Processing applies orientation, strips EXIF/GPS, reencodes JPEG to fit2048px and thumbnail320px, then hashes those exact stored bytes. Only generalized display coordinates (~200m grid) are retained when optional location is submitted. This display grid and salted SHA256 offchain pair commitment are proposals; final SC encoding and Meet verification grid remain open. Do not sign this internal commitment as final EIP-712 data.

See [setup guide](supabase-storage-setup.md). Real private-bucket upload/download/expiry and authenticated synthetic publication passed; verification evidence distinguishes these checks from automated mock/local-fixture tests. A failed cleanup may leave orphan files; no sweeper is implemented.

## Web client connection sequence

1. Configure the public Privy App ID and API origin `http://localhost:3001` in the web client. The current allowed local web origin is `http://localhost:3000`. Keep Supabase server credentials in `be/.env` only.
2. After Privy login, obtain a fresh access token with `getAccessToken()` and call `GET /v1/me` before creating a moment. This provisions the persistent backend account. Send the bearer token on each API request; never use a wallet address as authentication.
3. Create a draft, upload each side as raw JPEG/PNG bytes, then publish with `{}`. Use the returned moment ID for detail/Feed/Map navigation. A failed upload can be retried only if that side was not stored; an already stored side returns409. Use the explicit `/retake` endpoint to replace a stored draft side before publication.
4. Render returned signed thumbnails and request full-image URLs from the media endpoints when needed. URLs expire within60seconds; fetch a new URL through the authenticated API after expiry. Never persist a signed URL as a permanent image identifier.
5. Treat401 as a login/token refresh problem,404 as unavailable content without revealing whether another account owns it,409 as a state conflict,429 as throttling and503 as a dependency/configuration problem. Surface recoverable errors without changing audience or using a public storage fallback.

Real browser checks passed for owner200, accepted-friend200 and outsider404 on detail and both full-image endpoints. The friend check used a temporary local database fixture, removed afterward; new URL issuance then returned404 again. Previously issued signed URLs may remain usable until expiry. Friend request/accept/remove APIs were subsequently implemented and integration-tested; the browser fixture check itself does not verify that product user flow. Wangsit's product client integration remains unverified.

## Remaining integration decisions

The additional offchain route groups are ready for consumer review:

| Group | Routes and client behavior | Schema |
| --- | --- | --- |
| Friends | `GET /v1/friends`, `POST /v1/friends/requests {accountId}` or `{username}` (exactly one; username lookup is case-insensitive, unknown is 404), `POST /v1/friends/:accountId/accept {}`, `DELETE /v1/friends/:accountId`. Pending requests grant no access; only the recipient accepts. Lists have status/direction filters and bounded opaque cursors. No account search or listing; usernames are exact-match lookups only. | [friends](../be/specs/friends.openapi.json) |
| Streak | `GET /v1/me/streak` returns current/longest streak, postedToday, lastPublicationDay and timeZone. Only complete published capture-source moments count, grouped by server WIB day. | [streak](../be/specs/streak.openapi.json) |
| Comments | `POST/GET /v1/moments/:id/comments`, `DELETE /v1/moments/:id/comments/:commentId`. Trimmed text1..500 Unicode characters,20/minute/account; `parentId` lists replies or targets a root/reply when posting. Reuse optional UUID `clientRequestId` for retries: same payload returns200 without duplication, changed payload409. Without a key, each POST is a distinct intentional comment. Deleted roots with replies remain tombstones. | [comments](../be/specs/comments.openapi.json) |
| Selfie reactions | `POST/GET /v1/me/selfies`, `DELETE /v1/me/selfies/:selfieId`; `PUT/DELETE /v1/moments/:id/reaction`, `GET /v1/moments/:id/reactions`. Selfie upload is raw JPEG/PNG with the same8MiB normalization limits and5/minute/account. Replacement does not add a reaction. Library deletion prevents reuse but retains sent assets. | [reactions](../be/specs/reactions.openapi.json) |
| Event check-in | `GET /v1/events`, `GET /v1/events/:id`, `GET /v1/events/:id/check-in`; organizer-only `POST /v1/events/:id/check-ins {accountId}`. Server window applies to first check-in; retries preserve timestamps. No claim/collection eligibility is returned. | [events](../be/specs/events.openapi.json) |

All lists use server cursors and limits1..50. Interaction endpoints check the current published-moment audience; library endpoints are owner-only. These operations never award Dots or streak credit. Existing-account IDs must be supplied by an authorized application flow; fixture relationships/check-ins are not a completed product user flow.

Backend runtime direction is now Node 24, TypeScript, Fastify, npm per module, PostgreSQL/PostGIS; versions are pinned in `be/package.json` and lockfile. FE/mobile tooling and SC tooling remain their owners' responsibility. API schemas live in `be/specs/`; clients must not import private server source. Signing artifacts belong in `sc/specs/`; ABI/deployment exports in `sc/abi/` remain Diaz-owned.

Before implementing authenticated product APIs, agree Privy token verification and wallet binding, API origin/environment per client, account versus wallet identifiers and token refresh errors. No client-supplied account/wallet may establish identity.

Before Meet integration, settle exact EIP-712 domain/types/encoding/nonce/commitment/test vectors with Diaz and Wangsit. Backend must receive and validate Accept before the 60-second QR expiry. Separately define how authorized relay or attestation makes this check enforceable onchain after expiry; do not claim signature timestamps prove historical acceptance. Keep event ID immutable and validate both check-ins at acceptance.

Location accuracy/staleness, verification grid, display generalization, server-day boundary, relayer deadline and wallet support still need documented integration decisions. Existing pair/area/day and maximum five rules remain; no unreviewed threshold is silently locked by this foundation.

Live location consent/audience/interval/retention/background behavior and Dot visual exploration remain outside implemented behavior. No precise verification coordinates belong in map responses. No live location endpoint or socket is implemented.

## Canonical contract artifacts

Use `sc/specs/typed-data.mjs`, `sc/specs/protocol.ts`, `sc/specs/vectors.json` and `sc/abi/` with the [integration baseline](int-01-baseline.md). The backend derives the chain keccak commitment separately from its internal SHA256 media commitment. Verify public deployment addresses, role configuration and target-network behavior before enabling transaction workers.
