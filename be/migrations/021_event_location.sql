-- Public organizer-selected venue; separate from private participant/Meet locations.
ALTER TABLE events ADD COLUMN latitude double precision;
ALTER TABLE events ADD COLUMN longitude double precision;
ALTER TABLE events ADD CONSTRAINT events_location_valid CHECK (
 (latitude IS NULL AND longitude IS NULL) OR
 (latitude IS NOT NULL AND longitude IS NOT NULL AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
);
