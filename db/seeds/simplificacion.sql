-- Simplification seed for internal model (Camerfirma)
-- Generated from docs/simplificacion/007_internal_seed.sql + 008_sample_reservations_seed.sql

-- 007_internal_seed.sql
-- Seed aligned with the simplified internal model.

DO $$
DECLARE
  v_org_id uuid;
  v_office_id uuid;
  v_global_settings_id uuid;
  v_zone_entrada uuid;
  v_zone_despachos uuid;
  v_zone_abierta uuid;
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

  UPDATE offices
  SET
    canvas_width = COALESCE(canvas_width, 1600),
    canvas_height = COALESCE(canvas_height, 900)
  WHERE id = v_office_id;

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
    true,
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
    (v_office_id, 'Sala Entrada', '#2563eb', 10),
    (v_office_id, 'Despachos', '#16a34a', 20),
    (v_office_id, 'Sala Abierta', '#f59e0b', 30)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_zone_entrada FROM zones WHERE office_id = v_office_id AND name = 'Sala Entrada';
  SELECT id INTO v_zone_despachos FROM zones WHERE office_id = v_office_id AND name = 'Despachos';
  SELECT id INTO v_zone_abierta FROM zones WHERE office_id = v_office_id AND name = 'Sala Abierta';

  -- Align desk master data with frontend booking mock (codes, zones, status, coordinates).
  WITH desired AS (
    SELECT *
    FROM (
      VALUES
        (1,  'P01', 'Puesto 01', 'Sala Entrada', 'active',      NULL::text, 270::numeric, 520::numeric, 60::numeric, 44::numeric),
        (2,  'P02', 'Puesto 02', 'Sala Entrada', 'active',      NULL::text, 340::numeric, 520::numeric, 60::numeric, 44::numeric),
        (3,  'P03', 'Puesto 03', 'Sala Entrada', 'active',      NULL::text, 430::numeric, 500::numeric, 60::numeric, 44::numeric),
        (4,  'P04', 'Puesto 04', 'Despachos',    'active',      NULL::text, 530::numeric, 430::numeric, 60::numeric, 44::numeric),
        (5,  'P05', 'Puesto 05', 'Despachos',    'active',      NULL::text, 530::numeric, 350::numeric, 60::numeric, 44::numeric),
        (6,  'P06', 'Puesto 06', 'Sala Abierta', 'active',      NULL::text, 370::numeric, 210::numeric, 60::numeric, 44::numeric),
        (7,  'P07', 'Puesto 07', 'Sala Abierta', 'active',      NULL::text, 370::numeric, 140::numeric, 60::numeric, 44::numeric),
        (8,  'P08', 'Puesto 08', 'Sala Abierta', 'active',      NULL::text, 450::numeric, 210::numeric, 60::numeric, 44::numeric),
        (9,  'P09', 'Puesto 09', 'Sala Abierta', 'disabled',    NULL::text, 450::numeric, 140::numeric, 60::numeric, 44::numeric),
        (10, 'P10', 'Puesto 10', 'Sala Abierta', 'active',      NULL::text, 580::numeric,  80::numeric, 60::numeric, 44::numeric),
        (11, 'P11', 'Puesto 11', 'Sala Abierta', 'active',      NULL::text, 660::numeric,  80::numeric, 60::numeric, 44::numeric),
        (12, 'P12', 'Puesto 12', 'Sala Abierta', 'active',      NULL::text, 580::numeric, 155::numeric, 60::numeric, 44::numeric),
        (13, 'P13', 'Puesto 13', 'Sala Abierta', 'maintenance', NULL::text, 660::numeric, 155::numeric, 60::numeric, 44::numeric),
        (14, 'P14', 'Puesto 14', 'Sala Abierta', 'active',      NULL::text, 580::numeric, 230::numeric, 60::numeric, 44::numeric),
        (15, 'P15', 'Puesto 15', 'Sala Abierta', 'active',      NULL::text, 660::numeric, 230::numeric, 60::numeric, 44::numeric)
    ) AS t(
      display_order,
      code,
      name,
      zone_name,
      status,
      status_reason,
      layout_x,
      layout_y,
      layout_w,
      layout_h
    )
  )
  UPDATE desks d
  SET
    code = desired.code,
    name = desired.name,
    zone_id = z.id,
    status = desired.status,
    status_reason = desired.status_reason,
    layout_x = desired.layout_x,
    layout_y = desired.layout_y,
    layout_w = desired.layout_w,
    layout_h = desired.layout_h,
    rotation_deg = 0,
    display_order = desired.display_order
  FROM desired
  JOIN zones z
    ON z.office_id = v_office_id
   AND z.name = desired.zone_name
  WHERE d.office_id = v_office_id
    AND d.display_order = desired.display_order;

  WITH desired AS (
    SELECT *
    FROM (
      VALUES
        (1,  'P01', 'Puesto 01', 'Sala Entrada', 'active',      NULL::text, 270::numeric, 520::numeric, 60::numeric, 44::numeric),
        (2,  'P02', 'Puesto 02', 'Sala Entrada', 'active',      NULL::text, 340::numeric, 520::numeric, 60::numeric, 44::numeric),
        (3,  'P03', 'Puesto 03', 'Sala Entrada', 'active',      NULL::text, 430::numeric, 500::numeric, 60::numeric, 44::numeric),
        (4,  'P04', 'Puesto 04', 'Despachos',    'active',      NULL::text, 530::numeric, 430::numeric, 60::numeric, 44::numeric),
        (5,  'P05', 'Puesto 05', 'Despachos',    'active',      NULL::text, 530::numeric, 350::numeric, 60::numeric, 44::numeric),
        (6,  'P06', 'Puesto 06', 'Sala Abierta', 'active',      NULL::text, 370::numeric, 210::numeric, 60::numeric, 44::numeric),
        (7,  'P07', 'Puesto 07', 'Sala Abierta', 'active',      NULL::text, 370::numeric, 140::numeric, 60::numeric, 44::numeric),
        (8,  'P08', 'Puesto 08', 'Sala Abierta', 'active',      NULL::text, 450::numeric, 210::numeric, 60::numeric, 44::numeric),
        (9,  'P09', 'Puesto 09', 'Sala Abierta', 'disabled',    NULL::text, 450::numeric, 140::numeric, 60::numeric, 44::numeric),
        (10, 'P10', 'Puesto 10', 'Sala Abierta', 'active',      NULL::text, 580::numeric,  80::numeric, 60::numeric, 44::numeric),
        (11, 'P11', 'Puesto 11', 'Sala Abierta', 'active',      NULL::text, 660::numeric,  80::numeric, 60::numeric, 44::numeric),
        (12, 'P12', 'Puesto 12', 'Sala Abierta', 'active',      NULL::text, 580::numeric, 155::numeric, 60::numeric, 44::numeric),
        (13, 'P13', 'Puesto 13', 'Sala Abierta', 'maintenance', NULL::text, 660::numeric, 155::numeric, 60::numeric, 44::numeric),
        (14, 'P14', 'Puesto 14', 'Sala Abierta', 'active',      NULL::text, 580::numeric, 230::numeric, 60::numeric, 44::numeric),
        (15, 'P15', 'Puesto 15', 'Sala Abierta', 'active',      NULL::text, 660::numeric, 230::numeric, 60::numeric, 44::numeric)
    ) AS t(
      display_order,
      code,
      name,
      zone_name,
      status,
      status_reason,
      layout_x,
      layout_y,
      layout_w,
      layout_h
    )
  )
  INSERT INTO desks (
    office_id,
    zone_id,
    code,
    name,
    status,
    status_reason,
    qr_public_id,
    layout_x,
    layout_y,
    layout_w,
    layout_h,
    rotation_deg,
    display_order
  )
  SELECT
    v_office_id,
    z.id,
    desired.code,
    desired.name,
    desired.status,
    desired.status_reason,
    gen_random_uuid()::text,
    desired.layout_x,
    desired.layout_y,
    desired.layout_w,
    desired.layout_h,
    0,
    desired.display_order
  FROM desired
  JOIN zones z
    ON z.office_id = v_office_id
   AND z.name = desired.zone_name
  WHERE NOT EXISTS (
    SELECT 1
    FROM desks d
    WHERE d.office_id = v_office_id
      AND d.display_order = desired.display_order
  );

  WITH ordered_desks AS (
    SELECT
      d.id,
      row_number() OVER (
        ORDER BY d.display_order NULLS LAST, d.code
      ) AS rn
    FROM desks d
    WHERE d.office_id = v_office_id
      AND d.archived_at IS NULL
  ),
  layout_defaults AS (
    SELECT
      od.id,
      80 + (((od.rn - 1) % 5) * 220) AS def_x,
      100 + (((od.rn - 1) / 5) * 180) AS def_y,
      160 AS def_w,
      80 AS def_h
    FROM ordered_desks od
  )
  UPDATE desks d
  SET
    layout_x = COALESCE(d.layout_x, ld.def_x),
    layout_y = COALESCE(d.layout_y, ld.def_y),
    layout_w = COALESCE(d.layout_w, ld.def_w),
    layout_h = COALESCE(d.layout_h, ld.def_h)
  FROM layout_defaults ld
  WHERE d.id = ld.id
    AND (
      d.layout_x IS NULL
      OR d.layout_y IS NULL
      OR d.layout_w IS NULL
      OR d.layout_h IS NULL
    );

  INSERT INTO user_preferences (user_id)
  SELECT u.id
  FROM users u
  LEFT JOIN user_preferences up ON up.user_id = u.id
  WHERE up.user_id IS NULL;

  -- Align floorplan overlays with frontend mock baseline.
  WITH desired_overlays AS (
    SELECT *
    FROM (
      VALUES
        (1, 'SALA MADRID',         'room',     30::numeric, 420::numeric, 170::numeric, 170::numeric, 0::numeric, NULL::text,      NULL::text),
        (2, 'SALA ENTRADA',        'area',    210::numeric, 460::numeric, 210::numeric, 130::numeric, 0::numeric, NULL::text,      NULL::text),
        (3, 'DESPACHOS',           'room',    480::numeric, 380::numeric, 140::numeric, 130::numeric, 0::numeric, NULL::text,      NULL::text),
        (4, 'SALA ABIERTA',        'area',    320::numeric,  60::numeric, 200::numeric, 240::numeric, 0::numeric, '#b2dfdb'::text, '#e0f7f5'::text),
        (5, 'SALA ABIERTA (ext)',  'area',    540::numeric,  50::numeric, 200::numeric, 230::numeric, 0::numeric, '#b2dfdb'::text, '#e0f7f5'::text),
        (6, 'SALA ROMA',           'room',    640::numeric, 320::numeric, 110::numeric, 180::numeric, 0::numeric, NULL::text,      NULL::text),
        (7, 'Banos',               'facility', 30::numeric, 280::numeric, 150::numeric, 120::numeric, 0::numeric, NULL::text,      NULL::text)
    ) AS t(display_order, label, kind, x, y, w, h, rotation_deg, stroke_color, fill_color)
  )
  UPDATE floorplan_overlays fo
  SET
    label = desired_overlays.label,
    kind = desired_overlays.kind,
    x = desired_overlays.x,
    y = desired_overlays.y,
    w = desired_overlays.w,
    h = desired_overlays.h,
    rotation_deg = desired_overlays.rotation_deg,
    stroke_color = desired_overlays.stroke_color,
    fill_color = desired_overlays.fill_color,
    display_order = desired_overlays.display_order
  FROM desired_overlays
  WHERE fo.office_id = v_office_id
    AND fo.display_order = desired_overlays.display_order;

  WITH desired_overlays AS (
    SELECT *
    FROM (
      VALUES
        (1, 'SALA MADRID',         'room',     30::numeric, 420::numeric, 170::numeric, 170::numeric, 0::numeric, NULL::text,      NULL::text),
        (2, 'SALA ENTRADA',        'area',    210::numeric, 460::numeric, 210::numeric, 130::numeric, 0::numeric, NULL::text,      NULL::text),
        (3, 'DESPACHOS',           'room',    480::numeric, 380::numeric, 140::numeric, 130::numeric, 0::numeric, NULL::text,      NULL::text),
        (4, 'SALA ABIERTA',        'area',    320::numeric,  60::numeric, 200::numeric, 240::numeric, 0::numeric, '#b2dfdb'::text, '#e0f7f5'::text),
        (5, 'SALA ABIERTA (ext)',  'area',    540::numeric,  50::numeric, 200::numeric, 230::numeric, 0::numeric, '#b2dfdb'::text, '#e0f7f5'::text),
        (6, 'SALA ROMA',           'room',    640::numeric, 320::numeric, 110::numeric, 180::numeric, 0::numeric, NULL::text,      NULL::text),
        (7, 'Banos',               'facility', 30::numeric, 280::numeric, 150::numeric, 120::numeric, 0::numeric, NULL::text,      NULL::text)
    ) AS t(display_order, label, kind, x, y, w, h, rotation_deg, stroke_color, fill_color)
  )
  INSERT INTO floorplan_overlays (
    office_id,
    label,
    kind,
    x,
    y,
    w,
    h,
    rotation_deg,
    stroke_color,
    fill_color,
    display_order
  )
  SELECT
    v_office_id,
    desired_overlays.label,
    desired_overlays.kind,
    desired_overlays.x,
    desired_overlays.y,
    desired_overlays.w,
    desired_overlays.h,
    desired_overlays.rotation_deg,
    desired_overlays.stroke_color,
    desired_overlays.fill_color,
    desired_overlays.display_order
  FROM desired_overlays
  WHERE NOT EXISTS (
    SELECT 1
    FROM floorplan_overlays fo
    WHERE fo.office_id = v_office_id
      AND fo.display_order = desired_overlays.display_order
  );
END $$;


