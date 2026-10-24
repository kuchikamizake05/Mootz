# Read-only Monad indexing and finality

Apply migrations `015_chain_sync.sql` and `016_chain_evidence_constraints.sql`, build the backend, then explicitly invoke `npm run chain-sync:once` from the private server environment. The API and Compose do not start this worker. It reads the database and Monad RPC, writes only chain observation/index tables, and never signs or broadcasts a transaction. It does not need the relayer or issuer private key.

Set `CHAIN_SYNC_ENABLED=true`, `CHAIN_SYNC_CHAIN_ID=10143`, `CHAIN_SYNC_RPC_URL`, and a verified contract address plus its actual deployment block: `MEET_REGISTRY_ADDRESS` with `CHAIN_SYNC_MEET_START_BLOCK`, and/or `EVENT_COLLECTION_ADDRESS` with `CHAIN_SYNC_COLLECTION_START_BLOCK`. No deployment block is inferred. Existing durable cursors take precedence over the configured start block on later invocations. Reindexing is an explicit maintenance operation; never reset a cursor to bypass failed validation.

## Event indexing

The worker reads only `MeetRecorded`, `CollectionCreated`, and `CollectionClaimed` for the configured contracts. Each range ends at or below an explicit finalized head, and every returned log is checked against its canonical block hash. A provider without a usable finalized tag cannot establish finality. Logs and cursor advancement commit together. The key `(chain_id, contract_address, transaction_hash, log_index)` prevents duplicates across retries; a PostgreSQL advisory lock serializes indexer runs. Failed or malformed ranges do not advance the cursor. Range sizes shrink on provider errors, and each invocation performs a bounded amount of work before resuming on the next run.

Indexed event payloads are public chain data. They do not grant media access, friendship, check-in eligibility, ownership, or a Dot. No raw GPS, private media URL, signed Meet messages, or authentication credentials are added to the public index. The index is not exposed as a new public API in this change.

## Receipt reconciliation

The same command revisits transaction hashes in both outboxes, including completed provisional jobs. It checks the transaction identity and expected payload, receipt event, block number/hash, canonical block hash, and explicit finalized head. It stores observations separately from submission jobs, leaving signed transaction bytes and nonce reservations untouched. A failed or removed chain record never deletes its offchain Dot.

`chain_receipt_observations` records `pending`, `success`, `reverted`, or `mismatched`. Finality requires a canonical receipt block at or below the finalized head; a finalized revert is evidence of failure, not success. RPC errors never prove absence. Missing provisional receipts become pending; established finalized evidence is retained when a provider temporarily cannot return its receipt. This trusts the configured RPC's finalized-chain view; it is not independent consensus verification.

## API interpretation

Authenticated Dot list/detail and claim status responses add `chainOutcome` and report `finality` as `unverified`, `included`, or `finalized`. Evidence is joined by exact job, source, chain, contract, and transaction hash. No observation means `unverified`; legacy recorded/included status alone does not imply finality. `recorded=true` can still describe provisional inclusion for compatibility. A client should require both `finality=finalized` and `chainOutcome=success` before calling a record final. Finalized reverted execution is reported as failed/not_saved, never as ownership. Indexing and reconciliation retain existing audience/account checks.

Claim ownership and equipping continue to use the contract ownership read. A successful observation does not replace that check. Submission job completion timestamps are historical worker timestamps and can coexist with a later pending observation; they are not finality timestamps.

## Operations and limits

Schedule repeated explicit invocations only after verified deployment and provider setup. Monitor failures, cursor lag, oldest unchecked receipt, queue age, native relayer balance, and RPC limits. Keep the submission workers and indexer separate: a slow backfill must not block Meet validation or private media APIs. Use `npm run relay:inspect` and [nonce recovery](nonce-recovery.md) for stalled signed jobs. Replacement/cancellation remains a separately authorized operation.

Local synthetic tests do not prove live Monad deployment, role assignment, provider completeness, real gas cost, or product-client acceptance. The worker does not restore private records from chain data and does not provide arbitrary historical contract-state reads.
