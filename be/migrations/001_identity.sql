CREATE TABLE accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 provider_subject text NOT NULL UNIQUE CHECK (length(provider_subject) BETWEEN 1 AND 255),
 display_name text CHECK (length(display_name) BETWEEN 1 AND 80),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE wallet_bindings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL REFERENCES accounts(id),
 chain_id bigint NOT NULL CHECK (chain_id > 0), address text NOT NULL CHECK (address ~ '^0x[0-9a-f]{40}$'),
 verified_at timestamptz NOT NULL, revoked_at timestamptz,
 CHECK (revoked_at IS NULL OR revoked_at >= verified_at)
);
CREATE UNIQUE INDEX active_wallet_address ON wallet_bindings(chain_id,address) WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX active_account_wallet ON wallet_bindings(account_id,chain_id) WHERE revoked_at IS NULL;
CREATE TABLE onchain_preferences (
 account_id uuid PRIMARY KEY REFERENCES accounts(id), record_meet boolean NOT NULL DEFAULT true,
 onboarding_completed_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE preference_history (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, account_id uuid NOT NULL REFERENCES accounts(id),
 old_value boolean NOT NULL, new_value boolean NOT NULL, changed_at timestamptz NOT NULL DEFAULT now(),
 CHECK (old_value <> new_value)
);
CREATE INDEX preference_history_account ON preference_history(account_id,changed_at);
CREATE TABLE friendships (
 account_low uuid NOT NULL REFERENCES accounts(id), account_high uuid NOT NULL REFERENCES accounts(id),
 requested_by uuid NOT NULL REFERENCES accounts(id), status text NOT NULL CHECK (status IN ('pending','accepted','blocked')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(account_low,account_high), CHECK (account_low < account_high), CHECK (requested_by IN (account_low,account_high))
);
CREATE TABLE events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organizer_id uuid NOT NULL REFERENCES accounts(id),
 title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200), description text NOT NULL DEFAULT '',
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, location_label text,
 created_at timestamptz NOT NULL DEFAULT now(), CHECK (ends_at > starts_at)
);
