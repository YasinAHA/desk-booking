BEGIN;

CREATE TABLE IF NOT EXISTS floorplan_overlays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id uuid NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  label text NOT NULL,
  kind text NOT NULL DEFAULT 'room',
  x numeric(10,2) NOT NULL,
  y numeric(10,2) NOT NULL,
  w numeric(10,2) NOT NULL,
  h numeric(10,2) NOT NULL,
  rotation_deg numeric(6,2) NOT NULL DEFAULT 0,
  stroke_color text,
  fill_color text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_floorplan_overlays_kind CHECK (kind IN ('room', 'area', 'facility')),
  CONSTRAINT chk_floorplan_overlays_size CHECK (w > 0 AND h > 0),
  CONSTRAINT chk_floorplan_overlays_rotation CHECK (rotation_deg >= -360 AND rotation_deg <= 360)
);

CREATE INDEX IF NOT EXISTS ix_floorplan_overlays_office_order
  ON floorplan_overlays(office_id, display_order, label);

DROP TRIGGER IF EXISTS trg_floorplan_overlays_updated_at ON floorplan_overlays;
CREATE TRIGGER trg_floorplan_overlays_updated_at
  BEFORE UPDATE ON floorplan_overlays
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;
