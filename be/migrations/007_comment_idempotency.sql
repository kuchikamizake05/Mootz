ALTER TABLE moment_comments ADD COLUMN client_request_id uuid;
ALTER TABLE moment_comments ADD COLUMN request_fingerprint text;
ALTER TABLE moment_comments ADD CONSTRAINT comment_request_fingerprint CHECK (
 (client_request_id IS NULL AND request_fingerprint IS NULL)
 OR (client_request_id IS NOT NULL AND request_fingerprint ~ '^[0-9a-f]{64}$')
);
CREATE UNIQUE INDEX moment_comments_idempotency ON moment_comments(author_id,client_request_id) WHERE client_request_id IS NOT NULL;
