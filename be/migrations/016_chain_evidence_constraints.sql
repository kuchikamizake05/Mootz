ALTER TABLE chain_receipt_observations
 ADD CONSTRAINT receipt_evidence_complete CHECK (
  (receipt_block_number IS NULL AND receipt_block_hash IS NULL) OR
  (receipt_block_number IS NOT NULL AND receipt_block_number>=0 AND
   receipt_block_hash IS NOT NULL AND receipt_block_hash ~ '^0x[0-9a-f]{64}$')
 ),
 ADD CONSTRAINT receipt_outcome_requires_evidence CHECK (
  observed_status NOT IN ('success','reverted') OR receipt_block_number IS NOT NULL
 ),
 ADD CONSTRAINT finalized_receipt_evidence_complete CHECK (
  (finalized_at IS NULL AND finalized_block_number IS NULL AND finalized_block_hash IS NULL) OR
  (finalized_at IS NOT NULL AND observed_status IN ('success','reverted') AND
   receipt_block_number IS NOT NULL AND receipt_block_hash IS NOT NULL AND
   canonical_block_hash IS NOT NULL AND canonical_block_hash=receipt_block_hash AND
   finalized_block_number IS NOT NULL AND finalized_block_number>=receipt_block_number AND
   finalized_block_hash IS NOT NULL AND finalized_block_hash ~ '^0x[0-9a-f]{64}$')
 );

ALTER TABLE chain_sync_events
 ADD CONSTRAINT finalized_event_evidence_complete CHECK (
  (finalized_at IS NULL AND finalized_block_number IS NULL AND finalized_block_hash IS NULL) OR
  (finalized_at IS NOT NULL AND finalized_block_number IS NOT NULL AND finalized_block_number>=block_number AND
   finalized_block_hash IS NOT NULL AND finalized_block_hash ~ '^0x[0-9a-f]{64}$')
 );
