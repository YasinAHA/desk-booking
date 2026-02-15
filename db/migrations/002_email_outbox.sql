-- EMAIL OUTBOX
-- Stores email messages to be sent asynchronously
-- Provides transactional guarantees and retryability
CREATE TABLE IF NOT EXISTS email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  email_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, sent, failed
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  next_retry_at timestamptz
);

-- Index for finding pending emails to process
CREATE INDEX IF NOT EXISTS ix_email_outbox_pending
  ON email_outbox(status, next_retry_at)
  WHERE status = 'pending';

-- Index for monitoring failed emails
CREATE INDEX IF NOT EXISTS ix_email_outbox_failed
  ON email_outbox(status, created_at)
  WHERE status = 'failed';
