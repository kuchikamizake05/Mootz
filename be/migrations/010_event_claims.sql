CREATE TABLE event_collections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL UNIQUE REFERENCES events(id),
 chain_id bigint NOT NULL CHECK(chain_id>0), contract_address text NOT NULL CHECK(contract_address ~ '^0x[0-9a-f]{40}$' AND contract_address<>'0x0000000000000000000000000000000000000000'),
 collection_id numeric(78,0) NOT NULL CHECK(collection_id>0 AND collection_id<115792089237316195423570985008687907853269984665640564039457584007913129639936),
 claim_starts_at timestamptz NOT NULL, claim_ends_at timestamptz NOT NULL,
 display_name text NOT NULL CHECK(length(display_name) BETWEEN 1 AND 200), artwork_url text NOT NULL CHECK(artwork_url ~ '^https://[^[:space:]]+$'),
 UNIQUE(chain_id,contract_address,collection_id), CHECK(claim_ends_at>claim_starts_at)
);
CREATE TABLE claim_authorizations (
 id uuid PRIMARY KEY, account_id uuid NOT NULL REFERENCES accounts(id), collection_ref uuid NOT NULL REFERENCES event_collections(id),
 recipient text NOT NULL CHECK(recipient ~ '^0x[0-9a-f]{40}$'), issuer text NOT NULL CHECK(issuer ~ '^0x[0-9a-f]{40}$'),
 nonce text NOT NULL CHECK(nonce ~ '^0x[0-9a-f]{64}$'), deadline timestamptz NOT NULL, claim jsonb NOT NULL,
 signature text NOT NULL CHECK(signature ~ '^0x[0-9a-fA-F]{130}$'), client_request_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), UNIQUE(issuer,nonce), UNIQUE(account_id,client_request_id)
);
CREATE INDEX claim_authorizations_pending ON claim_authorizations(account_id,collection_ref,deadline);
