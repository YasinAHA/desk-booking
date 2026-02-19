CREATE TABLE IF NOT EXISTS password_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_password_resets_token_hash
  ON password_resets(token_hash);

CREATE INDEX IF NOT EXISTS ix_password_resets_user_id
  ON password_resets(user_id);

CREATE INDEX IF NOT EXISTS ix_password_resets_expires_at
  ON password_resets(expires_at);
