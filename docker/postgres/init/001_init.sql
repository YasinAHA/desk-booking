-- Docker bootstrap for brand-new local databases.
-- Source of truth for business schema: db/migrations/* via `npm -w backend run db:migrate`.

-- Minimal extensions required by migrations/runtime.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- Optional: roles/permissions bootstrap can be added here if needed.
-- Do not create business tables, indexes, triggers, or seed data in this file.

-- Set local default timezone for development (new DB only).
ALTER DATABASE deskbooking SET timezone TO 'Europe/Madrid';
