-- =====================================================================
-- MIGRATION PATCH: SaaS hardening + DBA consistency fixes
-- Target: desk-booking schema (organizations/offices/floors/zones/desks/
--         reservations/email_outbox/token_revocation/etc.)
--
-- This patch implements:
--  1) Remove legacy UNIQUE(desks.code) global constraint (SaaS breaker)
--  2) Enforce NOT NULL on desks.office_id (and reservations.office_id) post-backfill
--  3) Ensure desk.zone_id / desk.floor_id belong to the same office as desk.office_id
--  4) Reduce dual-source-of-truth: desks.is_active vs desks.status (add safety constraint)
--  5) Token revocation: use timestamptz for time columns; prefer uuid jti where possible
--  6) Proper overlap prevention for desk_blocks using EXCLUDE constraint (GiST)
--  7) Add updated_at auto-touch triggers for core tables
--  8) (Optional but recommended) Organization membership + multiple email domains
--
-- Notes:
--  - This script is designed to be safe and self-explanatory.
--  - Some steps are "guarded" with pre-checks that raise exceptions if data is invalid.
--  - Run in maintenance window if your system is under heavy write load.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 0) PRELUDE: ensure required extensions for exclusion constraints
-- ---------------------------------------------------------------------
-- Why: EXCLUDE USING gist with (uuid WITH =) relies on btree_gist to support
--      equality operators for UUID/text in GiST indexes.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------------------------------------------------------------------
-- 1) FIX: Drop legacy global UNIQUE constraint/index on desks.code
-- ---------------------------------------------------------------------
-- Problem:
--  - Initial schema had: desks.code UNIQUE (global).
--  - Later evolution introduced tenant-safe uniqueness: UNIQUE(office_id, code).
--  - If the old UNIQUE(code) still exists, it breaks SaaS because "D-001"
--    cannot be reused across different offices/tenants.
--
-- Approach:
--  - Detect and drop any UNIQUE constraint on desks where the ONLY column is "code".
--  - Also drop any unique index directly on (code) if present.
DO $$
DECLARE
  con RECORD;
  idx RECORD;
BEGIN
  -- Drop UNIQUE constraints on (code) only
  FOR con IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = current_schema()
      AND t.relname = 'desks'
      AND c.contype = 'u'
      AND (
        -- conkey length = 1 and that column is "code"
        array_length(c.conkey, 1) = 1
        AND (
          SELECT a.attname
          FROM pg_attribute a
          WHERE a.attrelid = c.conrelid
            AND a.attnum = c.conkey[1]
        ) = 'code'
      )
  LOOP
    EXECUTE format('ALTER TABLE %I.desks DROP CONSTRAINT %I', current_schema(), con.conname);
  END LOOP;

  -- Drop UNIQUE indexes whose indexed columns are exactly (code)
  FOR idx IN
    SELECT i.relname AS index_name
    FROM pg_class t
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_index x ON x.indrelid = t.oid
    JOIN pg_class i ON i.oid = x.indexrelid
    WHERE n.nspname = current_schema()
      AND t.relname = 'desks'
      AND x.indisunique = true
      AND x.indisprimary = false
      AND (
        SELECT array_agg(a.attname::text ORDER BY k.ord)
        FROM unnest(x.indkey) WITH ORDINALITY AS k(attnum, ord)
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
      ) = ARRAY['code']
  LOOP
    -- NOTE: if an index backs a constraint, it would already be removed above.
    -- This drop is safe only for "standalone" indexes.
    EXECUTE format('DROP INDEX IF EXISTS %I.%I', current_schema(), idx.index_name);
  END LOOP;
END $$;

-- Confirm tenant-safe uniqueness exists; create if missing.
-- Why: enforce uniqueness of desk codes per office (not global).
CREATE UNIQUE INDEX IF NOT EXISTS ux_desks_office_code ON desks (office_id, code);

-- ---------------------------------------------------------------------
-- 2) FIX: Enforce NOT NULL on desks.office_id (and reservations.office_id)
-- ---------------------------------------------------------------------
-- Problem:
--  - office_id was added nullable during migration to backfill existing rows.
--  - If left nullable, it allows "orphan" desks (office_id NULL) and weakens
--    UNIQUE(office_id, code) (Postgres allows multiple NULLs in UNIQUE).
--
-- Approach:
--  - Fail fast if nulls remain, then set NOT NULL.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM desks WHERE office_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot set desks.office_id NOT NULL: found rows with office_id IS NULL. Backfill first.';
  END IF;
END $$;

ALTER TABLE desks
  ALTER COLUMN office_id SET NOT NULL;

-- Same rationale for reservations.office_id if present in your schema.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'reservations'
      AND column_name = 'office_id'
  ) THEN
    IF EXISTS (SELECT 1 FROM reservations WHERE office_id IS NULL) THEN
      RAISE EXCEPTION 'Cannot set reservations.office_id NOT NULL: found rows with office_id IS NULL. Backfill first.';
    END IF;

    EXECUTE 'ALTER TABLE reservations ALTER COLUMN office_id SET NOT NULL';
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 3) FIX: Desk location consistency (floor/zone must belong to same office)
-- ---------------------------------------------------------------------
-- Problem:
--  - desks has office_id, floor_id, zone_id.
--  - floors and zones also point to office_id.
--  - Without enforcement, a desk can reference a zone/floor from a different office.
--
-- Approach:
--  - Add a BEFORE INSERT/UPDATE trigger that checks:
--      desk.floor_id -> floors.office_id == desk.office_id
--      desk.zone_id  -> zones.office_id  == desk.office_id
--  - This keeps data consistent under concurrency and protects from app bugs.
CREATE OR REPLACE FUNCTION validate_desk_location_consistency()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_floor_office uuid;
  v_zone_office uuid;
BEGIN
  -- Floor check
  IF NEW.floor_id IS NOT NULL THEN
    SELECT f.office_id INTO v_floor_office
    FROM floors f
    WHERE f.id = NEW.floor_id;

    IF v_floor_office IS NULL THEN
      RAISE EXCEPTION 'Invalid floor_id: % does not exist', NEW.floor_id;
    END IF;

    IF v_floor_office <> NEW.office_id THEN
      RAISE EXCEPTION 'Desk office_id (%) does not match floor.office_id (%) for floor_id (%)',
        NEW.office_id, v_floor_office, NEW.floor_id;
    END IF;
  END IF;

  -- Zone check
  IF NEW.zone_id IS NOT NULL THEN
    SELECT z.office_id INTO v_zone_office
    FROM zones z
    WHERE z.id = NEW.zone_id;

    IF v_zone_office IS NULL THEN
      RAISE EXCEPTION 'Invalid zone_id: % does not exist', NEW.zone_id;
    END IF;

    IF v_zone_office <> NEW.office_id THEN
      RAISE EXCEPTION 'Desk office_id (%) does not match zone.office_id (%) for zone_id (%)',
        NEW.office_id, v_zone_office, NEW.zone_id;
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_desk_location_consistency ON desks;

CREATE TRIGGER trg_validate_desk_location_consistency
BEFORE INSERT OR UPDATE OF office_id, floor_id, zone_id
ON desks
FOR EACH ROW
EXECUTE FUNCTION validate_desk_location_consistency();

-- ---------------------------------------------------------------------
-- 4) SAFETY: Prevent divergence between desks.is_active and desks.status
-- ---------------------------------------------------------------------
-- Problem:
--  - Legacy column: is_active boolean
--  - New column: status text ('active'|'maintenance'|'disabled')
--  - Two sources of truth can drift, causing confusing behavior.
--
-- Approach:
--  - Add a CHECK constraint that enforces consistency:
--      is_active = (status = 'active')
--  - This keeps old code paths safe while you gradually deprecate is_active in app.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'desks'
      AND column_name = 'is_active'
  ) THEN
    -- Remove if already exists (idempotent-ish)
    BEGIN
      EXECUTE 'ALTER TABLE desks DROP CONSTRAINT IF EXISTS chk_desks_is_active_matches_status';
    EXCEPTION WHEN undefined_object THEN
      -- ignore
      NULL;
    END;

    EXECUTE $c$
      ALTER TABLE desks
        ADD CONSTRAINT chk_desks_is_active_matches_status
        CHECK (
          (status = 'active' AND is_active = true)
          OR (status <> 'active' AND is_active = false)
        )
    $c$;
  END IF;
END $$;

-- Optional final step once the application no longer reads/writes is_active:
-- ALTER TABLE desks DROP COLUMN is_active;

-- ---------------------------------------------------------------------
-- 5) FIX: token_revocation timestamps use timestamptz; prefer UUID for jti
-- ---------------------------------------------------------------------
-- Problem:
--  - token_revocation.revoked_at/expires_at were TIMESTAMP (no tz).
--  - In a distributed system, timestamptz is safer and aligns with other tables.
--
-- Approach:
--  - Convert to timestamptz assuming stored values are UTC.
--    (If you stored local time, adjust the USING expression accordingly.)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'token_revocation'
      AND column_name = 'revoked_at'
  ) THEN
    -- Convert revoked_at
    EXECUTE $c$
      ALTER TABLE token_revocation
        ALTER COLUMN revoked_at TYPE timestamptz
        USING (revoked_at AT TIME ZONE 'UTC')
    $c$;

    -- Convert expires_at if present
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'token_revocation'
        AND column_name = 'expires_at'
    ) THEN
      EXECUTE $c$
        ALTER TABLE token_revocation
          ALTER COLUMN expires_at TYPE timestamptz
          USING (expires_at AT TIME ZONE 'UTC')
      $c$;
    END IF;
  END IF;
END $$;

-- Prefer UUID type for jti if possible (safe cast).
-- If jti contains non-UUID values, we keep it as text/varchar and add a CHECK to enforce UUID format going forward.
DO $$
DECLARE
  bad_count integer;
  jti_type text;
BEGIN
  SELECT data_type INTO jti_type
  FROM information_schema.columns
  WHERE table_schema = current_schema()
    AND table_name = 'token_revocation'
    AND column_name = 'jti';

  IF jti_type IS NULL THEN
    RETURN;
  END IF;

  IF jti_type <> 'uuid' THEN
    -- Count non-UUID rows; regexp is a pragmatic compromise.
    EXECUTE $q$
      SELECT count(*)
      FROM token_revocation
      WHERE jti IS NOT NULL
        AND jti !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    $q$ INTO bad_count;

    IF bad_count = 0 THEN
      -- Safe to convert
      EXECUTE $c$
        ALTER TABLE token_revocation
          ALTER COLUMN jti TYPE uuid
          USING (jti::uuid)
      $c$;
    ELSE
      -- Enforce format going forward (does not fix existing bad rows)
      EXECUTE 'ALTER TABLE token_revocation DROP CONSTRAINT IF EXISTS chk_token_revocation_jti_uuid_format';
      EXECUTE $c$
        ALTER TABLE token_revocation
          ADD CONSTRAINT chk_token_revocation_jti_uuid_format
          CHECK (
            jti IS NULL OR jti ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          )
      $c$;
    END IF;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 6) HARDEN: Prevent overlapping desk_blocks for same desk (production-grade)
-- ---------------------------------------------------------------------
-- Problem:
--  - desk_blocks has (desk_id, start_at, end_at) but without an overlap constraint,
--    concurrent writes may create overlapping blocks, breaking availability logic.
--
-- Approach:
--  - Add constraint: end_at > start_at
--  - Add EXCLUDE constraint using tstzrange(start_at, end_at, '[)') with overlap operator &&
--  - This is the canonical Postgres solution for time-range overlap prevention.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema()
      AND table_name = 'desk_blocks'
  ) THEN
    -- Ensure end_at is present and sensible
    EXECUTE 'ALTER TABLE desk_blocks DROP CONSTRAINT IF EXISTS chk_desk_blocks_end_after_start';
    EXECUTE 'ALTER TABLE desk_blocks ADD CONSTRAINT chk_desk_blocks_end_after_start CHECK (end_at > start_at)';

    -- Exclusion constraint (idempotent via try-catch)
    BEGIN
      EXECUTE $c$
        ALTER TABLE desk_blocks
          ADD CONSTRAINT ex_desk_blocks_no_overlap
          EXCLUDE USING gist (
            desk_id WITH =,
            tstzrange(start_at, end_at, '[)') WITH &&
          )
      $c$;
    EXCEPTION
      WHEN duplicate_object THEN
        -- already exists
        NULL;
    END;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 7) QUALITY: updated_at auto-touch triggers for core tables
-- ---------------------------------------------------------------------
-- Problem:
--  - updated_at DEFAULT now() does not update automatically on UPDATE.
--
-- Approach:
--  - Add a generic trigger that sets NEW.updated_at = now() on updates.
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

-- Attach to tables that have updated_at column (guarded).
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users',
    'organizations',
    'offices',
    'floors',
    'zones',
    'desks',
    'reservations',
    'reservation_policies'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = t
        AND column_name = 'updated_at'
    ) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_touch_updated_at ON %I', t);
      EXECUTE format('CREATE TRIGGER trg_touch_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION touch_updated_at()', t);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 8) OPTIONAL (recommended SaaS): organization_members + multiple email domains
-- ---------------------------------------------------------------------
-- Why:
--  - users.role as a global role is rarely correct in multi-tenant SaaS.
--  - Tenants often have multiple email domains (aliases, acquisitions, etc.).
--
-- This section is safe and additive: it does not remove existing columns.
-- You can migrate the app gradually to use these tables.

-- 8.1 organization_domains: supports multiple domains per organization
CREATE TABLE IF NOT EXISTS organization_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  domain citext NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, domain)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_organization_domains_domain
  ON organization_domains (domain);

-- Backfill from organizations.email_domain if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'organizations'
      AND column_name = 'email_domain'
  ) THEN
    INSERT INTO organization_domains (organization_id, domain)
    SELECT o.id, o.email_domain
    FROM organizations o
    WHERE o.email_domain IS NOT NULL
    ON CONFLICT (organization_id, domain) DO NOTHING;
  END IF;
END $$;

-- 8.2 organization_members: per-tenant roles
CREATE TABLE IF NOT EXISTS organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member','admin','owner')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS ix_organization_members_user_id
  ON organization_members (user_id);

CREATE INDEX IF NOT EXISTS ix_organization_members_org_id
  ON organization_members (organization_id);

-- Backfill: map users.role -> organization_members.role using users.organization_id
-- (If your users table doesn't have organization_id, skip gracefully.)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'users'
      AND column_name = 'organization_id'
  ) THEN
    INSERT INTO organization_members (organization_id, user_id, role)
    SELECT
      u.organization_id,
      u.id,
      CASE
        WHEN u.role = 'admin' THEN 'admin'
        ELSE 'member'
      END AS role
    FROM users u
    WHERE u.organization_id IS NOT NULL
    ON CONFLICT (organization_id, user_id) DO NOTHING;
  END IF;
END $$;

-- Optional next step (once app migrated):
--  - Deprecate users.role in favor of organization_members.role.
--  - Add guards to ensure every user belongs to at least one organization.

-- ---------------------------------------------------------------------
-- 9) POST-CHECKS (non-fatal info)
-- ---------------------------------------------------------------------
-- These SELECTs are meant to be inspected in your migration logs.
-- You can comment them out if your migration runner forbids result sets.

-- 9.1 Ensure no desks without office_id
SELECT count(*) AS desks_without_office
FROM desks
WHERE office_id IS NULL;

-- 9.2 Detect any inconsistent desks referencing floor/zone from another office
SELECT count(*) AS desks_inconsistent_zone
FROM desks d
JOIN zones z ON z.id = d.zone_id
WHERE d.zone_id IS NOT NULL AND z.office_id <> d.office_id;

SELECT count(*) AS desks_inconsistent_floor
FROM desks d
JOIN floors f ON f.id = d.floor_id
WHERE d.floor_id IS NOT NULL AND f.office_id <> d.office_id;

COMMIT;

-- =====================================================================
-- END PATCH
-- =====================================================================
