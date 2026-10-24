ALTER TABLE profile_frames DROP CONSTRAINT profile_frames_account_id_achievement_id_fkey;
ALTER TABLE profile_frames ADD FOREIGN KEY(account_id,achievement_id)
 REFERENCES achievement_unlocks(account_id,frame_id) ON DELETE CASCADE;
ALTER TABLE achievement_unlocks DROP CONSTRAINT achievement_unlocks_account_id_fkey;
ALTER TABLE achievement_unlocks ADD FOREIGN KEY(account_id)
 REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE profile_frames DROP CONSTRAINT profile_frames_account_id_fkey;
ALTER TABLE profile_frames ADD FOREIGN KEY(account_id)
 REFERENCES accounts(id) ON DELETE CASCADE;
