-- Backfill office canvas and desk layout defaults for pre-existing rows.
-- This is safe/idempotent and only fills missing values.

UPDATE offices
SET
  canvas_width = COALESCE(canvas_width, 1600),
  canvas_height = COALESCE(canvas_height, 900)
WHERE canvas_width IS NULL
   OR canvas_height IS NULL;

WITH ordered_desks AS (
  SELECT
    d.id,
    d.office_id,
    row_number() OVER (
      PARTITION BY d.office_id
      ORDER BY d.display_order NULLS LAST, d.code
    ) AS rn
  FROM desks d
  WHERE d.archived_at IS NULL
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
