CREATE TABLE event_checkins (
 event_id uuid NOT NULL REFERENCES events(id),
 account_id uuid NOT NULL REFERENCES accounts(id),
 checked_in_by uuid NOT NULL REFERENCES accounts(id),
 checked_in_at timestamptz NOT NULL,
 PRIMARY KEY(event_id,account_id)
);
CREATE INDEX events_chronological ON events(starts_at,id);
