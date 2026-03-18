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
