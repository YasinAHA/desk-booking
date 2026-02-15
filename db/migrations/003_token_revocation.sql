-- Token revocation blacklist table for JTI (JWT ID) tracking
CREATE TABLE IF NOT EXISTS token_revocation (
    jti VARCHAR(255) PRIMARY KEY,
    user_id uuid NOT NULL,
    revoked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indices for efficient queries
CREATE INDEX IF NOT EXISTS idx_token_revocation_user_id ON token_revocation(user_id);
CREATE INDEX IF NOT EXISTS idx_token_revocation_expires_at ON token_revocation(expires_at);

-- Procedure to clean up expired tokens (can be called manually or via cron)
CREATE OR REPLACE PROCEDURE cleanup_expired_tokens()
LANGUAGE SQL
AS $$
    DELETE FROM token_revocation
    WHERE expires_at < CURRENT_TIMESTAMP;
$$;
