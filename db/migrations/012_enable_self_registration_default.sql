BEGIN;

ALTER TABLE app_settings
  ALTER COLUMN allow_self_registration SET DEFAULT true;

UPDATE app_settings
SET allow_self_registration = true,
    updated_at = now()
WHERE scope_type = 'global'
  AND allow_self_registration IS DISTINCT FROM true;

COMMIT;
