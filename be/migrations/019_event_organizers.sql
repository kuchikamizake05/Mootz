CREATE TABLE event_organizers (
 account_id uuid PRIMARY KEY REFERENCES accounts(id),
 granted_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE events ADD COLUMN client_request_id uuid;
ALTER TABLE events ADD CONSTRAINT events_organizer_request UNIQUE (organizer_id, client_request_id);
CREATE INDEX events_organizer_chronological ON events(organizer_id, starts_at, id);
ALTER TABLE event_collections
 ADD COLUMN creation_transaction_hash text CHECK (creation_transaction_hash ~ '^0x[0-9a-f]{64}$'),
 ADD COLUMN creation_block_hash text CHECK (creation_block_hash ~ '^0x[0-9a-f]{64}$'),
 ADD COLUMN creation_block_number bigint CHECK (creation_block_number >= 0),
 ADD CONSTRAINT collection_creation_evidence CHECK (
  (creation_transaction_hash IS NULL AND creation_block_hash IS NULL AND creation_block_number IS NULL) OR
  (creation_transaction_hash IS NOT NULL AND creation_block_hash IS NOT NULL AND creation_block_number IS NOT NULL)
 );
