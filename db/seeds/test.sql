-- Test seed aligned with v1 schema (idempotent)
DO $$
DECLARE
  v_org_id uuid;
  v_office_id uuid;
BEGIN
  INSERT INTO organizations (name, email_domain)
  VALUES ('Test Org', 'test.local')
  ON CONFLICT (email_domain) DO NOTHING;

  SELECT id INTO v_org_id
  FROM organizations
  WHERE email_domain = 'test.local';

  INSERT INTO offices (organization_id, name, timezone)
  VALUES (v_org_id, 'Test Office', 'Europe/Madrid')
  ON CONFLICT (organization_id, name) DO NOTHING;

  SELECT id INTO v_office_id
  FROM offices
  WHERE organization_id = v_org_id AND name = 'Test Office';

  INSERT INTO reservation_policies (
    organization_id,
    max_advance_days,
    max_reservations_per_day,
    checkin_allowed_from,
    checkin_cutoff_time,
    cancellation_deadline_hours,
    require_email_domain_match
  )
  SELECT v_org_id, 7, 1, '06:00', '12:00', 2, false
  WHERE NOT EXISTS (
    SELECT 1 FROM reservation_policies
    WHERE organization_id = v_org_id AND office_id IS NULL
  );

  INSERT INTO desks (office_id, code, name, qr_public_id)
  SELECT
    v_office_id,
    'T' || lpad(i::text, 2, '0'),
    'Test ' || lpad(i::text, 2, '0'),
    gen_random_uuid()::text
  FROM generate_series(1, 3) i
  ON CONFLICT (office_id, code) DO NOTHING;
END $$;
