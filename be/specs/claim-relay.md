# Event claim relay operations

The API enqueues a previously issued own authorization; it does not broadcast. The one-shot worker is opt-in and requires a trusted operator to schedule it. Claim vouchers never reserve collection supply. Queuing, inclusion and ownership are separate states.

## API and status

Use a stable `authorizationId` for POST `/v1/events/:id/claims`. The recipient comes from the verified wallet binding. Signature, exact collection/domain, check-in, claim window, current ownership and supply are checked. Role and nonce are checked against chain again by the worker. A configured read-only API can enqueue already signed authorizations without an issuer private key. New authorization issuance still requires the issuer key.

POST returns 202 for pending/new jobs and 200 for completed retries. GET `/v1/events/:id/claims/:claimId` is restricted to the original account and event, and works without a gateway. It exposes no raw transaction, signature, key or provider diagnostic. Wallet rotation/mapping changes prevent resubmission against a different identity; status remains available to the original account.

`included` means the transaction's successful receipt emitted the expected CollectionClaimed log from the configured address, and current contract state confirms claimed balance and used issuer nonce. It is not finality. `already_owned` means the worker found existing chain ownership before creating its own transaction. `failed` describes a terminal unsigned-policy rejection or a mined reverted/mismatched transaction. `pending` includes RPC outages, ambiguous broadcasts and delayed readback. The separate read-only chain worker supplies exact-transaction `chainOutcome` and `finality: unverified|included|finalized` evidence; without an observation finality is unverified. Finalized reverted execution remains failure. Consult the live collection ownership route for equip decisions. See [chain sync](chain-sync.md).

## Explicit worker execution

Apply all migrations and deploy both updated Meet and claim workers together. Old worker versions do not know about the other queue. In private server environment configuration, set `CLAIM_RELAYER_ENABLED=true`, `EVENT_COLLECTION_RPC_URL`, `EVENT_COLLECTION_ADDRESS`, and `RELAYER_PRIVATE_KEY`. The relayer must be distinct from the claim issuer and funded with native testnet gas. EventCollection claim submission itself requires no relayer role; the voucher issuer needs `ISSUER_ROLE`. MeetRegistry's separate RELAYER_ROLE remains required for Meet submissions.

Build with `npm run build`, then run `npm run claim-relay:once` from be/. This is an explicit onchain action when real configuration and a queued voucher exist. Do not run it against live funds merely to test configuration. Compose deliberately does not pass the relayer key or enable either worker inside the API. The CLI prints only bounded counters; errors are sanitized.

## Retry and nonce safety

Both workers hold PostgreSQL session advisory lock729610143 while preparing/broadcasting. Unresolved signed bytes in either queue block fresh nonce allocation in both, including during backoff. Raw bytes, hash and sender are persisted atomically before broadcast. Recovered sender, chain10143, exact contract/calldata, zero value and hash must match the stored job. Only EIP-1559 transactions within gas<=1,000,000 and the configured fee policy are accepted. `CLAIM_RELAY_MAX_FEE_GWEI` defaults to 500 and `CLAIM_RELAY_MAX_PRIORITY_FEE_GWEI` to 50; hard maxima are 1000 and 100 whole gwei. Actual fees are estimated through viem, not forced to those ceilings. Priority fee must not exceed max fee. Lower budgets only after signed queues drain: saved transactions are validated against the same policy and must never be erased to bypass a lower budget.

An ambiguous send retries the same bytes. A pending signed transaction is not forgotten when a voucher expires, an issuer is revoked, or another claim grants ownership. After expiry the worker polls receipts and preserves the reserved nonce; it does not prepare a replacement or cancellation. If signed payload validation or readback fails, preserve the job and escalate to the operator. Do not delete a pending row, clear signed fields, rotate the relayer key, or manually mark completion to bypass a stuck nonce. Coordinate all users of the relayer wallet: outside senders are not synchronized by this database lock.

## Live acceptance blocker

SC-03 issue12 is still open and the repository's deployment template is NOT_DEPLOYED with null addresses/receipts. Diaz must supply verified deployment/collection mapping and issuer role evidence. Faaid/operator then privately configures and funds the dedicated relayer. No live issuer key, deployment or chain transaction was used in this implementation. Local tests use real PostgreSQL plus labelled injected RPC/transport adapters and generated local signatures.

Before production, verify the read-only finality/reconciliation worker against the actual RPC and deployed contracts, along with replacement/cancellation procedures, funding/fee monitoring, worker scheduling, backup/recovery and access controls. Completed jobs are revisited by the explicitly scheduled chain worker; without it their status remains provisional. Equip always checks live ownership. The read-only nonce inspection tool diagnoses unresolved jobs but never replaces/cancels them. Full Event/browser acceptance and independent Gathering B remain pending owner integration.
