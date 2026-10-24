CREATE TABLE wallet_challenges (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), subject text NOT NULL,
 wallet text NOT NULL CHECK (wallet ~ '^0x[0-9a-fA-F]{40}$'), message text NOT NULL,
 expires_at timestamptz NOT NULL, consumed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), CHECK (expires_at > created_at)
);
CREATE INDEX wallet_challenges_expiry ON wallet_challenges(expires_at);
