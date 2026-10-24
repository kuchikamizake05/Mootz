CREATE TABLE meet_offers (
 id uuid PRIMARY KEY, moment_id uuid NOT NULL REFERENCES moments(id), poster_id uuid NOT NULL REFERENCES accounts(id),
 poster_wallet text NOT NULL, chain_id bigint NOT NULL, verifying_contract text NOT NULL,
 offer jsonb NOT NULL, poster_signature text, poster_location jsonb, expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX meet_offer_nonce ON meet_offers(poster_wallet,(offer->>'nonce'));
CREATE INDEX expired_offer_locations ON meet_offers(expires_at) WHERE poster_location IS NOT NULL;
CREATE TABLE meets (
 id uuid PRIMARY KEY REFERENCES meet_offers(id), moment_id uuid NOT NULL REFERENCES moments(id),
 poster_id uuid NOT NULL REFERENCES accounts(id), scanner_id uuid NOT NULL REFERENCES accounts(id),
 poster_wallet text NOT NULL, scanner_wallet text NOT NULL, accepted_at timestamptz NOT NULL,
 area_key text NOT NULL, server_day date NOT NULL, offer jsonb NOT NULL, acceptance jsonb NOT NULL,
 poster_signature text NOT NULL, scanner_signature text NOT NULL, chain_id bigint NOT NULL, verifying_contract text NOT NULL,
 chain_status text NOT NULL CHECK(chain_status IN ('pending','recorded','not_saved')), transaction_hash text,
 CHECK(poster_id<>scanner_id), CHECK(poster_wallet<>scanner_wallet)
);
CREATE UNIQUE INDEX meet_pair_area_day ON meets(LEAST(poster_id,scanner_id),GREATEST(poster_id,scanner_id),area_key,server_day);
CREATE INDEX meet_pair_day ON meets(LEAST(poster_id,scanner_id),GREATEST(poster_id,scanner_id),server_day);
CREATE TABLE dots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), meet_id uuid NOT NULL UNIQUE REFERENCES meets(id),
 hidden_by uuid REFERENCES accounts(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE meet_outbox (
 meet_id uuid PRIMARY KEY REFERENCES meets(id), attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0),
 next_attempt_at timestamptz NOT NULL DEFAULT now(), leased_until timestamptz, raw_transaction text,
 transaction_hash text, last_error text, completed_at timestamptz
);
