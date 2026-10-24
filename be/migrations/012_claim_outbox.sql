CREATE TABLE claim_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), authorization_id uuid NOT NULL UNIQUE REFERENCES claim_authorizations(id),
 account_id uuid NOT NULL REFERENCES accounts(id), event_id uuid NOT NULL REFERENCES events(id),
 chain_id bigint NOT NULL CHECK(chain_id=10143), verifying_contract text NOT NULL CHECK(verifying_contract ~ '^0x[0-9a-f]{40}$' AND verifying_contract<>'0x0000000000000000000000000000000000000000'),
 claim jsonb NOT NULL, signature text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','included','failed','already_owned')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0), next_attempt_at timestamptz NOT NULL DEFAULT clock_timestamp(), leased_until timestamptz,
 raw_transaction text, transaction_hash text, relayer_address text, last_error text,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), completed_at timestamptz,
 CHECK((raw_transaction IS NULL AND transaction_hash IS NULL AND relayer_address IS NULL) OR (raw_transaction IS NOT NULL AND transaction_hash IS NOT NULL AND relayer_address IS NOT NULL)),
 CHECK(raw_transaction IS NULL OR raw_transaction ~ '^0x([0-9a-fA-F]{2})+$'),
 CHECK(transaction_hash IS NULL OR transaction_hash ~ '^0x[0-9a-f]{64}$'),
 CHECK(relayer_address IS NULL OR relayer_address ~ '^0x[0-9a-f]{40}$')
);
CREATE INDEX claim_outbox_due ON claim_outbox(next_attempt_at,id) WHERE completed_at IS NULL;
