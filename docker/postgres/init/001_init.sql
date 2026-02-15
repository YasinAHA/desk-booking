-- NOTE: este init solo se usa en DB nuevas via Docker.
-- Para cambios de esquema usa migraciones en db/migrations y ejecuta `npm run db:migrate`.

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

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL UNIQUE,
  password_hash text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  second_last_name text,
  confirmed_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT chk_users_status CHECK (status in ('active', 'suspended')),
  CONSTRAINT chk_users_role CHECK (role in ('user', 'admin'))
);

-- EMAIL VERIFICATIONS
CREATE TABLE IF NOT EXISTS email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_email_verifications_token
  ON email_verifications(token_hash);

CREATE INDEX IF NOT EXISTS ix_email_verifications_user
  ON email_verifications(user_id);

-- DESKS
CREATE TABLE IF NOT EXISTS desks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id uuid NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  floor_id uuid REFERENCES floors(id) ON DELETE SET NULL,
  zone_id uuid REFERENCES zones(id) ON DELETE SET NULL,
  code text NOT NULL,
  name text,
  status text NOT NULL DEFAULT 'active',
  qr_public_id text NOT NULL,
  status_changed_at timestamptz,
  status_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_desks_status CHECK (status in ('active', 'maintenance', 'disabled'))
);

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
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_policy_times CHECK (checkin_allowed_from < checkin_cutoff_time),
  CONSTRAINT chk_policy_positive CHECK (
    max_advance_days >= 0 
    AND max_reservations_per_day > 0 
    AND cancellation_deadline_hours >= 0
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_policies_org_default
  ON reservation_policies(organization_id)
  WHERE office_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_policies_office
  ON reservation_policies(organization_id, office_id)
  WHERE office_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_policies_org_office
  ON reservation_policies(organization_id, office_id);

-- RESERVATIONS
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  desk_id uuid NOT NULL REFERENCES desks(id) ON DELETE RESTRICT,
  office_id uuid NOT NULL REFERENCES offices(id) ON DELETE RESTRICT,
  reservation_date date NOT NULL,
  status text NOT NULL DEFAULT 'reserved',
  created_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  check_in_at timestamptz,
  no_show_at timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'user',
  CONSTRAINT chk_reservations_status CHECK (status in ('reserved', 'checked_in', 'cancelled', 'no_show')),
  CONSTRAINT chk_reservations_source CHECK (source in ('user', 'admin', 'walk_in', 'system'))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_res_active_user_day
  ON reservations(user_id, reservation_date)
  WHERE status in ('reserved', 'checked_in');

CREATE UNIQUE INDEX IF NOT EXISTS ux_res_active_desk_day
  ON reservations(desk_id, reservation_date)
  WHERE status in ('reserved', 'checked_in');

CREATE INDEX IF NOT EXISTS ix_reservations_date
  ON reservations(reservation_date);

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
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_audit_actor_type CHECK (actor_type in ('user', 'admin', 'system')),
  CONSTRAINT chk_audit_event_type CHECK (event_type in (
    'reservation_created',
    'reservation_cancelled',
    'reservation_checked_in',
    'reservation_no_show',
    'desk_status_changed',
    'desk_block_created',
    'desk_block_ended',
    'user_status_changed',
    'admin_action'
  ))
);

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
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_desk_blocks_end_after_start CHECK (end_at IS NULL OR end_at > start_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_desk_blocks_open
  ON desk_blocks(desk_id)
  WHERE end_at IS NULL;

-- EMAIL OUTBOX
CREATE TABLE IF NOT EXISTS email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  email_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  CONSTRAINT chk_email_outbox_status CHECK (status in ('pending', 'processing', 'sent', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  next_retry_at timestamptz
);

CREATE INDEX IF NOT EXISTS ix_email_outbox_pending
  ON email_outbox(status, next_retry_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS ix_email_outbox_failed
  ON email_outbox(status, created_at)
  WHERE status = 'failed';

CREATE INDEX IF NOT EXISTS ix_email_outbox_next_retry
  ON email_outbox(next_retry_at)
  WHERE status = 'pending';

-- TOKEN REVOCATION
CREATE TABLE IF NOT EXISTS token_revocation (
  jti text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  revoked_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_token_revocation_user_id ON token_revocation(user_id);
CREATE INDEX IF NOT EXISTS idx_token_revocation_expires_at ON token_revocation(expires_at);

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

-- Seed: org + office + policies (idempotent)
DO $$
DECLARE
  v_org_id uuid;
  v_office_id uuid;
BEGIN
  -- Insert or get organization
  INSERT INTO organizations (name, email_domain)
  VALUES ('Camerfirma', 'camerfirma.com')
  ON CONFLICT (email_domain) DO NOTHING;
  
  SELECT id INTO v_org_id FROM organizations WHERE email_domain = 'camerfirma.com';
  
  -- Insert or get office
  INSERT INTO offices (organization_id, name, timezone)
  VALUES (v_org_id, 'Camerfirma HQ', 'Europe/Madrid')
  ON CONFLICT (organization_id, name) DO NOTHING;
  
  SELECT id INTO v_office_id FROM offices WHERE organization_id = v_org_id AND name = 'Camerfirma HQ';
  
  -- Insert default policy if not exists (org-level, office_id=NULL)
  INSERT INTO reservation_policies (
    organization_id,
    max_advance_days,
    max_reservations_per_day,
    checkin_allowed_from,
    checkin_cutoff_time,
    cancellation_deadline_hours,
    require_email_domain_match
  )
  SELECT v_org_id, 7, 1, '06:00', '12:00', 2, true
  WHERE NOT EXISTS (
    SELECT 1 FROM reservation_policies 
    WHERE organization_id = v_org_id AND office_id IS NULL
  );
  
  -- Insert desks (use office_id variable)
  INSERT INTO desks(office_id, code, name, qr_public_id)
  SELECT
    v_office_id,
    'D' || lpad(i::text, 2, '0'),
    'Puesto ' || lpad(i::text, 2, '0'),
    gen_random_uuid()::text
  FROM generate_series(1, 15) i
  ON CONFLICT (office_id, code) DO NOTHING;
END $$;