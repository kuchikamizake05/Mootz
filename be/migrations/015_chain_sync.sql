CREATE TABLE chain_sync_cursors (
 chain_id bigint NOT NULL CHECK(chain_id=10143),
 contract_address text NOT NULL CHECK(contract_address ~ '^0x[0-9a-f]{40}$'),
 stream text NOT NULL CHECK(stream IN ('MeetRecorded','CollectionCreated','CollectionClaimed')),
 next_block bigint NOT NULL CHECK(next_block>=0),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(chain_id,contract_address,stream)
);

CREATE TABLE chain_sync_events (
 chain_id bigint NOT NULL CHECK(chain_id=10143),
 contract_address text NOT NULL CHECK(contract_address ~ '^0x[0-9a-f]{40}$'),
 transaction_hash text NOT NULL CHECK(transaction_hash ~ '^0x[0-9a-f]{64}$'),
 log_index integer NOT NULL CHECK(log_index>=0),
 block_number bigint NOT NULL CHECK(block_number>=0),
 block_hash text NOT NULL CHECK(block_hash ~ '^0x[0-9a-f]{64}$'),
 event_name text NOT NULL CHECK(event_name IN ('MeetRecorded','CollectionCreated','CollectionClaimed')),
 payload jsonb NOT NULL,
 finalized_at timestamptz,
 finalized_block_number bigint,
 finalized_block_hash text,
 inserted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(chain_id,contract_address,transaction_hash,log_index),
 CHECK((finalized_at IS NULL AND finalized_block_number IS NULL AND finalized_block_hash IS NULL) OR
       (finalized_at IS NOT NULL AND finalized_block_number>=block_number AND finalized_block_hash ~ '^0x[0-9a-f]{64}$'))
);
CREATE INDEX chain_sync_events_finalized ON chain_sync_events(chain_id,event_name,block_number) WHERE finalized_at IS NOT NULL;

CREATE TABLE chain_receipt_observations (
 source text NOT NULL CHECK(source IN ('meet','claim')),
 job_id uuid NOT NULL,
 chain_id bigint NOT NULL CHECK(chain_id=10143),
 contract_address text NOT NULL CHECK(contract_address ~ '^0x[0-9a-f]{40}$'),
 transaction_hash text NOT NULL CHECK(transaction_hash ~ '^0x[0-9a-f]{64}$'),
 observed_status text NOT NULL CHECK(observed_status IN ('pending','success','reverted','mismatched')),
 receipt_block_number bigint,
 receipt_block_hash text,
 canonical_block_hash text,
 finalized_at timestamptz,
 finalized_block_number bigint,
 finalized_block_hash text,
 checked_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(source,job_id),
 CHECK((receipt_block_number IS NULL AND receipt_block_hash IS NULL) OR
       (receipt_block_number>=0 AND receipt_block_hash ~ '^0x[0-9a-f]{64}$')),
 CHECK(finalized_at IS NULL OR (observed_status IN ('success','reverted','mismatched') AND receipt_block_number IS NOT NULL AND
       finalized_block_number>=receipt_block_number AND finalized_block_hash ~ '^0x[0-9a-f]{64}$' AND
       canonical_block_hash=receipt_block_hash))
);
