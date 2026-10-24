CREATE TABLE collection_equips (
 account_id uuid PRIMARY KEY REFERENCES accounts(id),
 collection_ref uuid NOT NULL REFERENCES event_collections(id),
 equipped_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
