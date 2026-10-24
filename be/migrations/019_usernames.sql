ALTER TABLE accounts ADD COLUMN IF NOT EXISTS username text CHECK (username ~ '^[a-z0-9_]{3,20}$');
CREATE UNIQUE INDEX IF NOT EXISTS accounts_username_key ON accounts(username);
