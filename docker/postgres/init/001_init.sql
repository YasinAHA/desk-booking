-- EXT
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- DESKS
CREATE TABLE IF NOT EXISTS desks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,     -- "D01"...
  name text NOT NULL,            -- "Puesto 01"...
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RESERVATIONS (1 desk/día por usuario)
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  desk_id uuid NOT NULL REFERENCES desks(id),
  reserved_date date NOT NULL,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_res_one_user_day
  ON reservations(user_id, reserved_date)
  WHERE cancelled_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_res_one_desk_day
  ON reservations(desk_id, reserved_date)
  WHERE cancelled_at IS NULL;

-- seed 15 desks
INSERT INTO desks(code, name)
SELECT
  'D' || lpad(i::text, 2, '0'),
  'Puesto ' || lpad(i::text, 2, '0')
FROM generate_series(1, 15) i
ON CONFLICT (code) DO NOTHING;
