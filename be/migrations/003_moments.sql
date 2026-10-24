CREATE TABLE moments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), author_id uuid NOT NULL REFERENCES accounts(id),
 source text NOT NULL CHECK(source IN ('capture','upload')), caption text NOT NULL DEFAULT '',
 event_id uuid REFERENCES events(id), display_lat double precision, display_lng double precision,
 created_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz,
 pair_commitment text, commitment_salt text,
 CHECK (length(caption)<=2000), CHECK ((display_lat IS NULL)=(display_lng IS NULL)),
 CHECK ((published_at IS NULL)=(pair_commitment IS NULL))
);
CREATE INDEX moments_published ON moments(published_at DESC,id DESC) WHERE published_at IS NOT NULL;
CREATE TABLE moment_media (
 moment_id uuid NOT NULL REFERENCES moments(id), side text NOT NULL CHECK(side IN ('front','back')),
 image_key text NOT NULL UNIQUE, thumbnail_key text NOT NULL UNIQUE,
 sha256 text NOT NULL, thumbnail_sha256 text NOT NULL, width integer NOT NULL CHECK(width>0),height integer NOT NULL CHECK(height>0),
 PRIMARY KEY(moment_id,side)
);
