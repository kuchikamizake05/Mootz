CREATE TABLE selfies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),account_id uuid NOT NULL REFERENCES accounts(id),
 image_key text NOT NULL UNIQUE,thumbnail_key text NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT date_trunc('milliseconds',clock_timestamp()),deleted_at timestamptz
);
CREATE INDEX selfies_owner_page ON selfies(account_id,created_at DESC,id DESC);
CREATE TABLE moment_reactions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),moment_id uuid NOT NULL REFERENCES moments(id),
 account_id uuid NOT NULL REFERENCES accounts(id),selfie_id uuid NOT NULL REFERENCES selfies(id),
 created_at timestamptz NOT NULL DEFAULT date_trunc('milliseconds',clock_timestamp()),
 UNIQUE(moment_id,account_id)
);
CREATE INDEX reactions_moment_page ON moment_reactions(moment_id,created_at DESC,id DESC);
