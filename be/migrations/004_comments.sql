CREATE TABLE moment_comments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 moment_id uuid NOT NULL REFERENCES moments(id),
 author_id uuid NOT NULL REFERENCES accounts(id),
 parent_id uuid,
 reply_to_id uuid,
 body text,
 created_at timestamptz NOT NULL DEFAULT date_trunc('milliseconds',clock_timestamp()),
 deleted_at timestamptz,
 UNIQUE(moment_id,id),
 FOREIGN KEY(moment_id,parent_id) REFERENCES moment_comments(moment_id,id),
 FOREIGN KEY(moment_id,reply_to_id) REFERENCES moment_comments(moment_id,id),
 CHECK ((parent_id IS NULL)=(reply_to_id IS NULL)),
 CHECK (parent_id IS NULL OR parent_id<>id),
 CHECK ((deleted_at IS NULL AND body IS NOT NULL AND char_length(body) BETWEEN 1 AND 500 AND body=btrim(body)) OR (deleted_at IS NOT NULL AND body IS NULL))
);
CREATE INDEX moment_comments_page ON moment_comments(moment_id,parent_id,created_at,id);
CREATE INDEX moment_comments_rate ON moment_comments(author_id,created_at);
