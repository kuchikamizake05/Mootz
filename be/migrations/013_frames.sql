CREATE TABLE achievement_unlocks (
 account_id uuid NOT NULL REFERENCES accounts(id),
 frame_id text NOT NULL CHECK(frame_id IN ('first_meet','together','social_butterfly')),
 unlocked_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(account_id,frame_id)
);
CREATE TABLE profile_frames (
 account_id uuid PRIMARY KEY REFERENCES accounts(id),
 achievement_id text,
 collection_ref uuid REFERENCES event_collections(id),
 equipped_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK ((achievement_id IS NULL) <> (collection_ref IS NULL)),
 FOREIGN KEY(account_id,achievement_id) REFERENCES achievement_unlocks(account_id,frame_id)
);
INSERT INTO profile_frames(account_id,collection_ref,equipped_at)
 SELECT account_id,collection_ref,equipped_at FROM collection_equips;
DROP TABLE collection_equips;
CREATE VIEW collection_equips AS
 SELECT account_id,collection_ref,equipped_at FROM profile_frames WHERE collection_ref IS NOT NULL;
