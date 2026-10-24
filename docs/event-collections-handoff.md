# Event collection backend handoff

Scope: Event collection eligibility, authorization, claim queue and profile equip. Client acceptance and public deployment remain separate checks.

## Consumer contract

- Authenticate with the Privy bearer token and finish wallet binding. Collection state is `GET /v1/events/:id/collection`. Distinguish `eligible`, `not_checked_in`, `not_open`, `closed`, `sold_out`, `already_owned`, and `issuer_unavailable`. RPC failures return 503, never a fabricated zero balance.
- Request `POST /v1/events/:id/claim-authorizations` with a stable UUID `clientRequestId` for retries. The backend derives recipient, collection, nonce, deadline and issuer. Response `status: authorized` is a short-lived canonical Claim signature, not a transaction receipt or ownership. JSON uint256 values are decimal strings; convert to bigint for viem.
- An active authorization prevents another key for the same account/collection (`CLAIM_PENDING`). Matching retries require the same recipient, mapping, current eligibility and unexpired deadline. Expired requests need a new key. Contract supply can change after signing; the signature does not reserve stock.
- `PUT /v1/me/equipped-collection` body is `{ "collectionRef": "<backend collection UUID>" }`. Check-in/vouchers do not confer ownership. GET rechecks the current bound wallet against chain; DELETE is idempotent and works without an RPC gateway. This is the user's own equipped Event frame, not an achievement-threshold implementation.
- Read OpenAPI in `be/specs/collections.openapi.json` and `be/specs/equip.openapi.json`. Errors use the common safe `{error:{code,requestId}}` envelope through the main application.

## Deployment inputs still required

Diaz supplies the verified chain10143 EventCollection address, collection ID/event mapping, cap/public metadata and issuer role assignment. The contract eventId uses canonical UUID-to-bytes32 padding. An operator provisions the mapping through controlled PostgreSQL access, with UTC claim timestamps and public artwork. No demo address is automatically seeded and no administrative contract function is exposed over HTTP.

Server-only settings are `EVENT_COLLECTION_RPC_URL`, `EVENT_COLLECTION_ADDRESS`, and optional `EVENT_CLAIM_ISSUER_PRIVATE_KEY`. Read-only configuration permits ownership/equip; authorization requires the dedicated issuer signer. These values never belong in FE configuration. The normal API starts no transaction sender. No live signing key, deployment, mint or blockchain transaction was used in verification.

## Remaining acceptance

Queued sponsored claim submission and provisional receipt/readback checks are described in `be/specs/claim-relay.md`. The separate chain worker records finality observations. Verify live deployment, provider behavior and browser claim/equip acceptance before release.
