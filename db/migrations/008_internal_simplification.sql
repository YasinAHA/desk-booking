-- 007_internal_simplification.sql
-- Camerfirma internal simplification aligned with admin panel and range reservations.
-- Target: evolve the current v1 schema without losing historical data.

BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS citext;

-- ------------------------------------------------------------
-- 1) USER PREFERENCES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'system',
  language text NOT NULL DEFAULT 'es',
  timezone text NOT NULL DEFAULT 'Europe/Madrid',
  email_notifications_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_user_preferences_theme CHECK (theme IN ('light', 'dark', 'system')),
  CONSTRAINT chk_user_preferences_language CHECK (language IN ('es', 'en'))
);

INSERT INTO user_preferences (user_id)
SELECT u.id
FROM users u
LEFT JOIN user_preferences up ON up.user_id = u.id
WHERE up.user_id IS NULL;

-- ------------------------------------------------------------
-- 2) ADMIN SETTINGS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type text NOT NULL DEFAULT 'global',
  office_id uuid REFERENCES offices(id) ON DELETE CASCADE,
  allow_self_registration boolean NOT NULL DEFAULT false,
  guest_mode_enabled boolean NOT NULL DEFAULT true,
  checkin_window_minutes integer NOT NULL DEFAULT 15,
  max_advance_days integer NOT NULL DEFAULT 7,
  max_reservations_per_user integer NOT NULL DEFAULT 1,
  cancellation_deadline_minutes integer NOT NULL DEFAULT 120,
  default_reservation_duration_minutes integer NOT NULL DEFAULT 480,
  business_hours_start time NOT NULL DEFAULT '08:00',
  business_hours_end time NOT NULL DEFAULT '20:00',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_app_settings_scope CHECK (scope_type IN ('global', 'office')),
  CONSTRAINT chk_app_settings_positive CHECK (
    checkin_window_minutes > 0
    AND max_advance_days >= 0
    AND max_reservations_per_user > 0
    AND cancellation_deadline_minutes >= 0
    AND default_reservation_duration_minutes > 0
  ),
  CONSTRAINT chk_app_settings_hours CHECK (business_hours_start < business_hours_end)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_app_settings_global
  ON app_settings(scope_type)
  WHERE scope_type = 'global';

CREATE UNIQUE INDEX IF NOT EXISTS ux_app_settings_office
  ON app_settings(office_id)
  WHERE scope_type = 'office' AND office_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS allowed_email_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_settings_id uuid NOT NULL REFERENCES app_settings(id) ON DELETE CASCADE,
  domain citext NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_allowed_email_domains_setting_domain
  ON allowed_email_domains(app_settings_id, domain);

-- Migrate legacy reservation_policies into app_settings if available.
DO $$
DECLARE
  v_global_settings_id uuid;
BEGIN
  INSERT INTO app_settings (
    scope_type,
    allow_self_registration,
    guest_mode_enabled,
    checkin_window_minutes,
    max_advance_days,
    max_reservations_per_user,
    cancellation_deadline_minutes,
    default_reservation_duration_minutes,
    business_hours_start,
    business_hours_end
  )
  SELECT
    'global',
    false,
    true,
    GREATEST(15, COALESCE((EXTRACT(EPOCH FROM (checkin_cutoff_time - checkin_allowed_from)) / 60)::int, 15)),
    max_advance_days,
    max_reservations_per_day,
    cancellation_deadline_hours * 60,
    480,
    checkin_allowed_from,
    checkin_cutoff_time
  FROM reservation_policies
  WHERE office_id IS NULL
    AND NOT EXISTS (SELECT 1 FROM app_settings WHERE scope_type = 'global')
  LIMIT 1;

  IF NOT EXISTS (SELECT 1 FROM app_settings WHERE scope_type = 'global') THEN
    INSERT INTO app_settings (scope_type, allow_self_registration)
    VALUES ('global', false);
  END IF;

  SELECT id INTO v_global_settings_id
  FROM app_settings
  WHERE scope_type = 'global'
  LIMIT 1;

  INSERT INTO allowed_email_domains (app_settings_id, domain)
  SELECT v_global_settings_id, o.email_domain
  FROM organizations o
  WHERE o.email_domain IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM allowed_email_domains aed
      WHERE aed.app_settings_id = v_global_settings_id
        AND aed.domain = o.email_domain
    );
END $$;

-- Enforce internal default for existing global settings.
UPDATE app_settings
SET allow_self_registration = false,
    updated_at = now()
WHERE scope_type = 'global'
  AND allow_self_registration IS DISTINCT FROM false;

-- Keep legacy policies for traceability but mark them as legacy.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'reservation_policies'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'reservation_policies_legacy'
  ) THEN
    ALTER TABLE reservation_policies RENAME TO reservation_policies_legacy;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 3) LAYOUT / ADMIN CUSTOMIZATION
-- ------------------------------------------------------------
ALTER TABLE offices
  ADD COLUMN IF NOT EXISTS floorplan_image_url text,
  ADD COLUMN IF NOT EXISTS canvas_width integer,
  ADD COLUMN IF NOT EXISTS canvas_height integer;

ALTER TABLE zones
  DROP COLUMN IF EXISTS floor_id,
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS ux_zones_office_name
  ON zones(office_id, name);

ALTER TABLE desks
  DROP COLUMN IF EXISTS floor_id,
  ADD COLUMN IF NOT EXISTS layout_x numeric(10,2),
  ADD COLUMN IF NOT EXISTS layout_y numeric(10,2),
  ADD COLUMN IF NOT EXISTS layout_w numeric(10,2),
  ADD COLUMN IF NOT EXISTS layout_h numeric(10,2),
  ADD COLUMN IF NOT EXISTS rotation_deg numeric(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_desks_rotation_deg') THEN
    ALTER TABLE desks
      ADD CONSTRAINT chk_desks_rotation_deg CHECK (rotation_deg >= -360 AND rotation_deg <= 360);
  END IF;
END $$;

-- Floors are deprecated for the internal model. Keep data if present, but remove active FKs.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'floors'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'floors_legacy'
  ) THEN
    ALTER TABLE floors RENAME TO floors_legacy;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 4) RESERVATIONS -> RANGE-BASED MODEL
-- ------------------------------------------------------------
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS reservation_type text NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS host_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS guest_name text,
  ADD COLUMN IF NOT EXISTS guest_email citext,
  ADD COLUMN IF NOT EXISTS guest_company text,
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS checkin_deadline_at timestamptz,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Keep compatibility with existing column name if present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'check_in_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'checked_in_at'
  ) THEN
    ALTER TABLE reservations RENAME COLUMN check_in_at TO checked_in_at;
  END IF;
END $$;

-- Backfill starts_at / ends_at from reservation_date for existing data.
DO $$
DECLARE
  v_duration_minutes integer;
  v_checkin_minutes integer;
BEGIN
  SELECT default_reservation_duration_minutes, checkin_window_minutes
  INTO v_duration_minutes, v_checkin_minutes
  FROM app_settings
  WHERE scope_type = 'global'
  LIMIT 1;

  v_duration_minutes := COALESCE(v_duration_minutes, 480);
  v_checkin_minutes := COALESCE(v_checkin_minutes, 15);

  UPDATE reservations
  SET starts_at = COALESCE(starts_at, reservation_date::timestamp AT TIME ZONE 'Europe/Madrid'),
      ends_at = COALESCE(ends_at, (reservation_date::timestamp AT TIME ZONE 'Europe/Madrid') + make_interval(mins => v_duration_minutes)),
      checkin_deadline_at = COALESCE(checkin_deadline_at, (reservation_date::timestamp AT TIME ZONE 'Europe/Madrid') + make_interval(mins => v_checkin_minutes))
  WHERE reservation_date IS NOT NULL
    AND (starts_at IS NULL OR ends_at IS NULL OR checkin_deadline_at IS NULL);
END $$;

ALTER TABLE reservations
  ALTER COLUMN starts_at SET NOT NULL,
  ALTER COLUMN ends_at SET NOT NULL,
  ALTER COLUMN checkin_deadline_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_reservations_type') THEN
    ALTER TABLE reservations
      ADD CONSTRAINT chk_reservations_type CHECK (reservation_type IN ('internal', 'guest'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_reservations_range') THEN
    ALTER TABLE reservations
      ADD CONSTRAINT chk_reservations_range CHECK (ends_at > starts_at);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_reservations_checkin_deadline') THEN
    ALTER TABLE reservations
      ADD CONSTRAINT chk_reservations_checkin_deadline CHECK (checkin_deadline_at >= starts_at AND checkin_deadline_at <= ends_at);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_guest_reservation_shape') THEN
    ALTER TABLE reservations
      ADD CONSTRAINT chk_guest_reservation_shape CHECK (
        (reservation_type = 'internal' AND user_id IS NOT NULL)
        OR
        (
          reservation_type = 'guest'
          AND host_user_id IS NOT NULL
          AND guest_name IS NOT NULL
          AND guest_email IS NOT NULL
        )
      );
  END IF;
END $$;

ALTER TABLE reservations
  DROP COLUMN IF EXISTS reservation_date;

DROP INDEX IF EXISTS ux_res_active_user_day;
DROP INDEX IF EXISTS ux_res_active_desk_day;
DROP INDEX IF EXISTS ix_reservations_status_date;
DROP INDEX IF EXISTS ix_reservations_user_status;

CREATE INDEX IF NOT EXISTS ix_reservations_status_starts_at
  ON reservations(status, starts_at);

CREATE INDEX IF NOT EXISTS ix_reservations_user_status_starts_at
  ON reservations(user_id, status, starts_at)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_reservations_host_status_starts_at
  ON reservations(host_user_id, status, starts_at)
  WHERE host_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_reservations_office_starts_at
  ON reservations(office_id, starts_at);

CREATE INDEX IF NOT EXISTS ix_reservations_desk_starts_at
  ON reservations(desk_id, starts_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'excl_reservations_active_desk_slot'
  ) THEN
    ALTER TABLE reservations
      ADD CONSTRAINT excl_reservations_active_desk_slot
      EXCLUDE USING gist (
        desk_id WITH =,
        tstzrange(starts_at, ends_at, '[)') WITH &&
      )
      WHERE (status IN ('reserved', 'checked_in'));
  END IF;
END $$;

-- Keep office consistency trigger but adapt it to new columns.
CREATE OR REPLACE FUNCTION ensure_reservation_office_consistency()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.office_id IS NULL THEN
    SELECT office_id INTO NEW.office_id FROM desks WHERE id = NEW.desk_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'desk_id % does not exist', NEW.desk_id;
    END IF;
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
-- ------------------------------------------------------------
-- 4.1) DESK BLOCKS HARDENING
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'desk_blocks'
  ) THEN
    ALTER TABLE desk_blocks
      DROP CONSTRAINT IF EXISTS chk_desk_blocks_end_after_start;

    ALTER TABLE desk_blocks
      ADD CONSTRAINT chk_desk_blocks_end_after_start
      CHECK (end_at > start_at);

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'ex_desk_blocks_no_overlap'
    ) THEN
      ALTER TABLE desk_blocks
        ADD CONSTRAINT ex_desk_blocks_no_overlap
        EXCLUDE USING gist (
          desk_id WITH =,
          tstzrange(start_at, end_at, '[)') WITH &&
        );
    END IF;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 5) UPDATED_AT TRIGGERS
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER trg_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_app_settings_updated_at ON app_settings;
CREATE TRIGGER trg_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_offices_updated_at ON offices;
CREATE TRIGGER trg_offices_updated_at
  BEFORE UPDATE ON offices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_zones_updated_at ON zones;
CREATE TRIGGER trg_zones_updated_at
  BEFORE UPDATE ON zones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_desks_updated_at ON desks;
CREATE TRIGGER trg_desks_updated_at
  BEFORE UPDATE ON desks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_reservations_updated_at ON reservations;
CREATE TRIGGER trg_reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;
