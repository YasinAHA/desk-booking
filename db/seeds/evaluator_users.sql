-- Evaluator/demo users seed (idempotent)
-- Default credentials:
--   admin@camerfirma.com / Admin#2026Segura
--   demo@camerfirma.com  / Demo#2026Segura
-- Rotate passwords after demo/use in any non-temporary environment.

INSERT INTO users (
  email,
  password_hash,
  first_name,
  last_name,
  second_last_name,
  confirmed_at,
  role,
  status
)
VALUES (
  'admin@camerfirma.com',
  '$argon2id$v=19$m=65536,t=3,p=4$p/VR1ec07GSxr7BHnyOV8A$qSHbrxgf39YaTxooI8Q5SMWsW7PbYV0OEDEkeNB2z4o',
  'Admin',
  'Evaluator',
  NULL,
  now(),
  'admin',
  'active'
)
ON CONFLICT (email) DO UPDATE
SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  second_last_name = EXCLUDED.second_last_name,
  confirmed_at = COALESCE(users.confirmed_at, EXCLUDED.confirmed_at),
  role = EXCLUDED.role,
  status = EXCLUDED.status;

INSERT INTO users (
  email,
  password_hash,
  first_name,
  last_name,
  second_last_name,
  confirmed_at,
  role,
  status
)
VALUES (
  'demo@camerfirma.com',
  '$argon2id$v=19$m=65536,t=3,p=4$6c9Wx7bRh9SzAZls7gNKEg$/VjuwGjUya3j4AQwkq/PWHlxjFKvjtlOu7pN3Tu6UwU',
  'Usuario',
  'Demo',
  NULL,
  now(),
  'user',
  'active'
)
ON CONFLICT (email) DO UPDATE
SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  second_last_name = EXCLUDED.second_last_name,
  confirmed_at = COALESCE(users.confirmed_at, EXCLUDED.confirmed_at),
  role = EXCLUDED.role,
  status = EXCLUDED.status;
