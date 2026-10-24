-- Preserve testnet evidence; allow separate mainnet jobs and index cursors.
ALTER TABLE claim_outbox DROP CONSTRAINT claim_outbox_chain_id_check,
 ADD CONSTRAINT claim_outbox_chain_id_check CHECK (chain_id IN (143,10143));
ALTER TABLE chain_sync_cursors DROP CONSTRAINT chain_sync_cursors_chain_id_check,
 ADD CONSTRAINT chain_sync_cursors_chain_id_check CHECK (chain_id IN (143,10143));
ALTER TABLE chain_sync_events DROP CONSTRAINT chain_sync_events_chain_id_check,
 ADD CONSTRAINT chain_sync_events_chain_id_check CHECK (chain_id IN (143,10143));
ALTER TABLE chain_receipt_observations DROP CONSTRAINT chain_receipt_observations_chain_id_check,
 ADD CONSTRAINT chain_receipt_observations_chain_id_check CHECK (chain_id IN (143,10143));
