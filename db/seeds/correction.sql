-- Correction seed aligned with v1 schema (idempotent)
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

  INSERT INTO desks (office_id, code, name, qr_public_id)
  SELECT
    v_office_id,
    'D' || lpad(i::text, 2, '0'),
    'Puesto ' || lpad(i::text, 2, '0'),
    gen_random_uuid()::text
  FROM generate_series(1, 15) i
  ON CONFLICT (office_id, code) DO NOTHING;

  INSERT INTO zones (office_id, name)
  SELECT v_office_id, z.name
  FROM (VALUES ('Zona A'), ('Zona B'), ('Zona C')) AS z(name)
  WHERE NOT EXISTS (
    SELECT 1 FROM zones existing
    WHERE existing.office_id = v_office_id AND existing.name = z.name
  );

  WITH ordered_desks AS (
    SELECT d.id, row_number() OVER (ORDER BY d.code) AS rn
    FROM desks d
    WHERE d.office_id = v_office_id
  ),
  zone_refs AS (
    SELECT z.id, z.name
    FROM zones z
    WHERE z.office_id = v_office_id AND z.name IN ('Zona A', 'Zona B', 'Zona C')
  )
  UPDATE desks d
  SET zone_id = CASE ((ordered_desks.rn - 1) % 3)
    WHEN 0 THEN (SELECT id FROM zone_refs WHERE name = 'Zona A')
    WHEN 1 THEN (SELECT id FROM zone_refs WHERE name = 'Zona B')
    ELSE (SELECT id FROM zone_refs WHERE name = 'Zona C')
  END
  FROM ordered_desks
  WHERE d.id = ordered_desks.id
    AND d.zone_id IS NULL;
END $$;
