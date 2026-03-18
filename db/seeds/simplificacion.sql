-- Simplification seed for internal model (Camerfirma)
-- Generated from docs/simplificacion/007_internal_seed.sql + 008_sample_reservations_seed.sql

-- 007_internal_seed.sql
-- Seed aligned with the simplified internal model.

DO $$
DECLARE
  v_org_id uuid;
  v_office_id uuid;
  v_global_settings_id uuid;
  v_zone_a uuid;
  v_zone_b uuid;
  v_zone_c uuid;
BEGIN
  -- Organization kept only as a frozen internal anchor.
  INSERT INTO organizations (name, email_domain)
  VALUES ('Camerfirma', 'camerfirma.com')
  ON CONFLICT (email_domain) DO NOTHING;

  SELECT id INTO v_org_id
  FROM organizations
  WHERE email_domain = 'camerfirma.com';

  INSERT INTO offices (
    organization_id,
    name,
    address,
    timezone,
    canvas_width,
    canvas_height
  )
  VALUES (
    v_org_id,
    'Camerfirma HQ',
    'Madrid',
    'Europe/Madrid',
    1600,
    900
  )
  ON CONFLICT (organization_id, name) DO NOTHING;

  SELECT id INTO v_office_id
  FROM offices
  WHERE organization_id = v_org_id
    AND name = 'Camerfirma HQ';

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
    business_hours_end,
    office_id
  )
  SELECT
    'global',
    false,
    true,
    15,
    7,
    1,
    120,
    480,
    '08:00',
    '20:00',
    NULL
  WHERE NOT EXISTS (
    SELECT 1 FROM app_settings WHERE scope_type = 'global'
  );

  SELECT id INTO v_global_settings_id
  FROM app_settings
  WHERE scope_type = 'global';

  INSERT INTO allowed_email_domains (app_settings_id, domain)
  SELECT v_global_settings_id, 'camerfirma.com'
  WHERE NOT EXISTS (
    SELECT 1
    FROM allowed_email_domains
    WHERE app_settings_id = v_global_settings_id
      AND domain = 'camerfirma.com'
  );

  INSERT INTO zones (office_id, name, color, display_order)
  VALUES
    (v_office_id, 'Zona A', '#2563eb', 10),
    (v_office_id, 'Zona B', '#16a34a', 20),
    (v_office_id, 'Zona C', '#f59e0b', 30)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_zone_a FROM zones WHERE office_id = v_office_id AND name = 'Zona A';
  SELECT id INTO v_zone_b FROM zones WHERE office_id = v_office_id AND name = 'Zona B';
  SELECT id INTO v_zone_c FROM zones WHERE office_id = v_office_id AND name = 'Zona C';

  INSERT INTO desks (
    office_id,
    zone_id,
    code,
    name,
    status,
    qr_public_id,
    layout_x,
    layout_y,
    layout_w,
    layout_h,
    display_order
  )
  SELECT
    v_office_id,
    CASE ((i - 1) % 3)
      WHEN 0 THEN v_zone_a
      WHEN 1 THEN v_zone_b
      ELSE v_zone_c
    END,
    'D' || lpad(i::text, 2, '0'),
    'Puesto ' || lpad(i::text, 2, '0'),
    'active',
    gen_random_uuid()::text,
    80 + (((i - 1) % 5) * 220),
    100 + (((i - 1) / 5) * 180),
    160,
    80,
    i
  FROM generate_series(1, 15) AS i
  ON CONFLICT (office_id, code) DO NOTHING;

  INSERT INTO user_preferences (user_id)
  SELECT u.id
  FROM users u
  LEFT JOIN user_preferences up ON up.user_id = u.id
  WHERE up.user_id IS NULL;
END $$;


-- 008_sample_reservations_seed.sql
-- Optional sample reservations for local/dev testing after migration 007.

DO $$
DECLARE
  v_user_id uuid;
  v_desk_1 uuid;
  v_desk_2 uuid;
  v_office_id uuid;
  v_now timestamptz := now();
  v_start_1 timestamptz;
  v_end_1 timestamptz;
  v_start_2 timestamptz;
  v_end_2 timestamptz;
BEGIN
  SELECT id INTO v_user_id
  FROM users
  ORDER BY created_at
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No users found. Skipping sample reservations seed.';
    RETURN;
  END IF;

  SELECT id, office_id INTO v_desk_1, v_office_id
  FROM desks
  WHERE archived_at IS NULL AND status = 'active'
  ORDER BY code
  LIMIT 1;

  SELECT id INTO v_desk_2
  FROM desks
  WHERE archived_at IS NULL AND status = 'active' AND id <> v_desk_1
  ORDER BY code
  LIMIT 1;

  v_start_1 := date_trunc('day', v_now) + interval '9 hours';
  v_end_1 := v_start_1 + interval '4 hours';
  v_start_2 := date_trunc('day', v_now) + interval '14 hours';
  v_end_2 := v_start_2 + interval '3 hours';

  INSERT INTO reservations (
    user_id,
    desk_id,
    office_id,
    reservation_type,
    starts_at,
    ends_at,
    checkin_deadline_at,
    status,
    created_by,
    source
  )
  SELECT
    v_user_id,
    v_desk_1,
    v_office_id,
    'internal',
    v_start_1,
    v_end_1,
    v_start_1 + interval '15 minutes',
    'reserved',
    v_user_id,
    'user'
  WHERE NOT EXISTS (
    SELECT 1 FROM reservations
    WHERE desk_id = v_desk_1
      AND starts_at = v_start_1
      AND ends_at = v_end_1
  );

  INSERT INTO reservations (
    user_id,
    desk_id,
    office_id,
    reservation_type,
    starts_at,
    ends_at,
    checkin_deadline_at,
    status,
    created_by,
    source
  )
  SELECT
    v_user_id,
    v_desk_2,
    v_office_id,
    'internal',
    v_start_2,
    v_end_2,
    v_start_2 + interval '15 minutes',
    'checked_in',
    v_user_id,
    'admin'
  WHERE NOT EXISTS (
    SELECT 1 FROM reservations
    WHERE desk_id = v_desk_2
      AND starts_at = v_start_2
      AND ends_at = v_end_2
  );
END $$;

