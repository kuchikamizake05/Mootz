CREATE TABLE location_preferences (
 account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
 enabled boolean NOT NULL DEFAULT true
);
CREATE TABLE friend_locations (
 account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
 latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
 longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
 updated_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL
);
CREATE INDEX friend_locations_expiry ON friend_locations(expires_at);
