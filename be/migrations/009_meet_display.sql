ALTER TABLE meets ADD COLUMN display_lat double precision, ADD COLUMN display_lng double precision;
ALTER TABLE meets ADD CONSTRAINT meet_display_pair CHECK ((display_lat IS NULL)=(display_lng IS NULL));
