-- v1.0.0 schema alignment (Camerfirma Internal Release)

-- EXT
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- ORGANIZATIONS
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email_domain CITEXT NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_organizations_email_domain
  ON organizations(email_domain);

-- OFFICES
CREATE TABLE IF NOT EXISTS offices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  timezone text NOT NULL DEFAULT 'Europe/Madrid',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_offices_org_name
  ON offices(organization_id, name);

-- FLOORS (OPTIONAL)
CREATE TABLE IF NOT EXISTS floors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id uuid NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  name text NOT NULL,
  level int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ZONES (OPTIONAL)
CREATE TABLE IF NOT EXISTS zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id uuid NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  floor_id uuid REFERENCES floors(id) ON DELETE SET NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- USERS (ALTER)
-- Convertir email a CITEXT
ALTER TABLE users
  ALTER COLUMN email TYPE CITEXT USING LOWER(email);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS second_last_name text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Migrar display_name existente (si existe) a first_name
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'display_name') THEN
    UPDATE users SET first_name = COALESCE(display_name, 'Usuario'), last_name = '' WHERE first_name IS NULL;
  ELSE
    UPDATE users SET first_name = 'Usuario', last_name = '' WHERE first_name IS NULL;
  END IF;
END $$;

ALTER TABLE users
  ALTER COLUMN first_name SET NOT NULL,
  ALTER COLUMN last_name SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_status') THEN
    ALTER TABLE users
      ADD CONSTRAINT chk_users_status CHECK (status in ('active', 'suspended'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_role') THEN
    ALTER TABLE users
      ADD CONSTRAINT chk_users_role CHECK (role in ('user', 'admin'));
  END IF;
END $$;

-- DESKS (ALTER)
ALTER TABLE desks
  ADD COLUMN IF NOT EXISTS office_id uuid REFERENCES offices(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS floor_id uuid REFERENCES floors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS zone_id uuid REFERENCES zones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS qr_public_id text,
  ADD COLUMN IF NOT EXISTS status_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS status_reason text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Cambiar name a nullable si ya existe como NOT NULL
ALTER TABLE desks
  ALTER COLUMN name DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_desks_status') THEN
    ALTER TABLE desks
      ADD CONSTRAINT chk_desks_status CHECK (status in ('active', 'maintenance', 'disabled'));
  END IF;
END $$;

-- Default org/office for existing data (dev/local)
DO $$
DECLARE
  v_org_id uuid;
  v_office_id uuid;
BEGIN
  INSERT INTO organizations (name, email_domain)
  VALUES ('Camerfirma', 'camerfirma.com')
  ON CONFLICT (email_domain) DO NOTHING;

  SELECT id INTO v_org_id
  FROM organizations
  WHERE email_domain = 'camerfirma.com';

  INSERT INTO offices (organization_id, name, timezone)
  VALUES (v_org_id, 'Camerfirma HQ', 'Europe/Madrid')
  ON CONFLICT (organization_id, name) DO NOTHING;

  SELECT id INTO v_office_id
  FROM offices
  WHERE organization_id = v_org_id AND name = 'Camerfirma HQ';

  UPDATE desks
    SET office_id = v_office_id
  WHERE office_id IS NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'desks' AND column_name = 'is_active'
  ) THEN
    UPDATE desks
      SET status = CASE WHEN is_active THEN 'active' ELSE 'disabled' END
    WHERE status IS NULL;
  END IF;
END $$;

UPDATE desks
  SET qr_public_id = gen_random_uuid()::text
WHERE qr_public_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_desks_office_code
  ON desks(office_id, code);

CREATE UNIQUE INDEX IF NOT EXISTS ux_desks_qr_public_id
  ON desks(qr_public_id);

-- RESERVATION POLICIES
CREATE TABLE IF NOT EXISTS reservation_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  office_id uuid REFERENCES offices(id) ON DELETE CASCADE,
  max_advance_days int NOT NULL,
  max_reservations_per_day int NOT NULL,
  checkin_allowed_from time NOT NULL,
  checkin_cutoff_time time NOT NULL,
  cancellation_deadline_hours int NOT NULL,
  require_email_domain_match boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_policies_org_default
  ON reservation_policies(organization_id)
  WHERE office_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_policies_office
  ON reservation_policies(organization_id, office_id)
  WHERE office_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_policies_org_office
  ON reservation_policies(organization_id, office_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_policy_times') THEN
    ALTER TABLE reservation_policies
      ADD CONSTRAINT chk_policy_times CHECK (checkin_allowed_from < checkin_cutoff_time);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_policy_positive') THEN
    ALTER TABLE reservation_policies
      ADD CONSTRAINT chk_policy_positive CHECK (
        max_advance_days >= 0 
        AND max_reservations_per_day > 0 
        AND cancellation_deadline_hours >= 0
      );
  END IF;
END $$;

-- RESERVATIONS (ALTER)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'reserved_date'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'reservation_date'
  ) THEN
    ALTER TABLE reservations
      RENAME COLUMN reserved_date TO reservation_date;
  END IF;
END $$;

-- Modificar FKs existentes para soft delete strategy (RESTRICT)
ALTER TABLE reservations
  DROP CONSTRAINT IF EXISTS reservations_user_id_fkey,
  DROP CONSTRAINT IF EXISTS reservations_desk_id_fkey;

ALTER TABLE reservations
  ADD CONSTRAINT reservations_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  ADD CONSTRAINT reservations_desk_id_fkey
    FOREIGN KEY (desk_id) REFERENCES desks(id) ON DELETE RESTRICT;

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS office_id uuid REFERENCES offices(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'reserved',
  ADD COLUMN IF NOT EXISTS check_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS no_show_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'user';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_reservations_status') THEN
    ALTER TABLE reservations
      ADD CONSTRAINT chk_reservations_status CHECK (status in ('reserved', 'checked_in', 'cancelled', 'no_show'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_reservations_source') THEN
    ALTER TABLE reservations
      ADD CONSTRAINT chk_reservations_source CHECK (source in ('user', 'admin', 'walk_in', 'system'));
  END IF;
END $$;

UPDATE reservations r
  SET office_id = d.office_id
FROM desks d
WHERE r.desk_id = d.id
  AND r.office_id IS NULL;

UPDATE reservations
  SET status = CASE WHEN cancelled_at IS NOT NULL THEN 'cancelled' ELSE 'reserved' END
WHERE status IS NULL;

DROP INDEX IF EXISTS ux_res_one_user_day;
DROP INDEX IF EXISTS ux_res_one_desk_day;

CREATE UNIQUE INDEX IF NOT EXISTS ux_res_active_user_day
  ON reservations(user_id, reservation_date)
  WHERE status in ('reserved', 'checked_in');

CREATE UNIQUE INDEX IF NOT EXISTS ux_res_active_desk_day
  ON reservations(desk_id, reservation_date)
  WHERE status in ('reserved', 'checked_in');

CREATE INDEX IF NOT EXISTS ix_reservations_status_date
  ON reservations(status, reservation_date);

CREATE INDEX IF NOT EXISTS ix_reservations_user_status
  ON reservations(user_id, status);

-- Trigger para validar/autocomplete consistencia de office_id
CREATE OR REPLACE FUNCTION ensure_reservation_office_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- Si office_id es NULL, autocompletar desde desk
  IF NEW.office_id IS NULL THEN
    SELECT office_id INTO NEW.office_id FROM desks WHERE id = NEW.desk_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'desk_id % does not exist', NEW.desk_id;
    END IF;
  -- Si office_id viene informado, validar consistencia
  ELSIF NOT EXISTS (
    SELECT 1 FROM desks WHERE id = NEW.desk_id AND office_id = NEW.office_id
  ) THEN
    RAISE EXCEPTION 'desk_id % does not belong to office_id %', NEW.desk_id, NEW.office_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_reservation_office ON reservations;
CREATE TRIGGER trg_validate_reservation_office
  BEFORE INSERT OR UPDATE OF desk_id, office_id ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION ensure_reservation_office_consistency();

-- AUDIT EVENTS
CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  actor_type text NOT NULL,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  reservation_id uuid REFERENCES reservations(id) ON DELETE SET NULL,
  desk_id uuid REFERENCES desks(id) ON DELETE SET NULL,
  office_id uuid REFERENCES offices(id) ON DELETE SET NULL,
  reason text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_audit_actor_type') THEN
    ALTER TABLE audit_events
      ADD CONSTRAINT chk_audit_actor_type CHECK (actor_type in ('user', 'admin', 'system'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_audit_event_type') THEN
    ALTER TABLE audit_events
      ADD CONSTRAINT chk_audit_event_type CHECK (event_type in (
        'reservation_created',
        'reservation_cancelled',
        'reservation_checked_in',
        'reservation_no_show',
        'desk_status_changed',
        'desk_block_created',
        'desk_block_ended',
        'user_status_changed',
        'admin_action'
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_audit_events_created_at
  ON audit_events(created_at);

CREATE INDEX IF NOT EXISTS ix_audit_events_event_type
  ON audit_events(event_type);

CREATE INDEX IF NOT EXISTS ix_audit_events_reservation_id
  ON audit_events(reservation_id)
  WHERE reservation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_audit_events_desk_id
  ON audit_events(desk_id)
  WHERE desk_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_audit_events_actor_user
  ON audit_events(actor_user_id)
  WHERE actor_user_id IS NOT NULL;

-- DESK BLOCKS
CREATE TABLE IF NOT EXISTS desk_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  desk_id uuid NOT NULL REFERENCES desks(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  reason text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_desk_blocks_open
  ON desk_blocks(desk_id)
  WHERE end_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_desk_blocks_end_after_start') THEN
    ALTER TABLE desk_blocks
      ADD CONSTRAINT chk_desk_blocks_end_after_start CHECK (end_at IS NULL OR end_at > start_at);
  END IF;
END $$;

-- Índice adicional para email_verifications lookup
CREATE INDEX IF NOT EXISTS ix_email_verifications_user
  ON email_verifications(user_id);

-- Índice para email_outbox worker queries
CREATE INDEX IF NOT EXISTS ix_email_outbox_next_retry
  ON email_outbox(next_retry_at)
  WHERE status = 'pending';

-- EMAIL OUTBOX (kept)
CREATE TABLE IF NOT EXISTS email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  email_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_email_outbox_status CHECK (status in ('pending', 'processing', 'sent', 'failed')),
  processed_at timestamptz,
  next_retry_at timestamptz
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_email_outbox_status') THEN
    ALTER TABLE email_outbox
      DROP CONSTRAINT chk_email_outbox_status;
  END IF;
  ALTER TABLE email_outbox
    ADD CONSTRAINT chk_email_outbox_status CHECK (status in ('pending', 'processing', 'sent', 'failed'));
END $$;

CREATE INDEX IF NOT EXISTS ix_email_outbox_pending
  ON email_outbox(status, next_retry_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS ix_email_outbox_failed
  ON email_outbox(status, created_at)
  WHERE status = 'failed';

-- TOKEN REVOCATION (ALTER)
ALTER TABLE token_revocation
  ALTER COLUMN revoked_at TYPE timestamptz USING revoked_at AT TIME ZONE 'UTC',
  ALTER COLUMN expires_at TYPE timestamptz USING expires_at AT TIME ZONE 'UTC';

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_organizations_updated_at ON organizations;
CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_offices_updated_at ON offices;
CREATE TRIGGER trg_offices_updated_at
  BEFORE UPDATE ON offices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_floors_updated_at ON floors;
CREATE TRIGGER trg_floors_updated_at
  BEFORE UPDATE ON floors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_zones_updated_at ON zones;
CREATE TRIGGER trg_zones_updated_at
  BEFORE UPDATE ON zones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_desks_updated_at ON desks;
CREATE TRIGGER trg_desks_updated_at
  BEFORE UPDATE ON desks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_reservation_policies_updated_at ON reservation_policies;
CREATE TRIGGER trg_reservation_policies_updated_at
  BEFORE UPDATE ON reservation_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
