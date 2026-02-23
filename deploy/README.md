# Deploy (Production)

This folder contains the reproducible production deployment setup for the monorepo.

## Files

- `docker-compose.prod.yml`: production stack (postgres, backend, frontend, caddy).
- `caddy/Caddyfile`: reverse proxy and TLS entrypoint.
- `.env.example`: compose-level variables (`POSTGRES_PASSWORD`, `APP_DOMAIN`, frontend build arg).
- `env/backend.env.example`: backend environment template.
- `env/frontend.env.example`: frontend environment template.
- `scripts/init-db.sh`: applies all migrations and optional seed.
- `scripts/smoke-check.sh`: quick post-deploy checks (`health`, `register`, `login`).
- `LOCAL-CMDS.example.md`: local command reference template for ops.

## Target domain

- `https://deskbooking-yasin.duckdns.org`

## Usage

1. Copy env examples to real env files:
   - `cp deploy/.env.example deploy/.env`
   - `cp deploy/env/backend.env.example deploy/.env.backend`
   - `cp deploy/env/frontend.env.example deploy/.env.frontend`
2. Fill secrets and domain values.
3. Ensure `.env.backend` has same-origin HTTPS values:
   - `APP_BASE_URL=https://deskbooking-yasin.duckdns.org`
   - `FRONTEND_BASE_URL=https://deskbooking-yasin.duckdns.org`
   - `CORS_ORIGINS=https://deskbooking-yasin.duckdns.org`
4. Start stack:
   - `docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d --build`
5. Initialize database:
   - `sh deploy/scripts/init-db.sh correction`
5. Validate:
   - `https://deskbooking-yasin.duckdns.org/health`
   - `POST https://deskbooking-yasin.duckdns.org/auth/register` (or `/auth/login`)

## Database checklist

- Migrations available: `db/migrations/001..006`.
- Seeds available: `db/seeds/correction.sql`, `db/seeds/dev.sql`, `db/seeds/test.sql`.
- Recommended for evaluator/demo: `correction`.
- Init command:
  - `sh deploy/scripts/init-db.sh correction`

Note: in production, Swagger UI (`/docs`) is disabled by backend config.

## Notes

- Keep `EMAIL_MODE=fake` for delivery/demo if SMTP is not ready.
- Use strict `CORS_ORIGINS` with your production domain.
- Keep refresh cookies secure in production (`AUTH_REFRESH_COOKIE_SECURE=true`, `SAME_SITE=lax`).
- Do not commit real `.env` files.

## Seed options

- `correction`: data for evaluator/demo (org, office, zones, desks).
- `dev`: local development data.
- `test`: test-focused data.
- `evaluator_users`: creates fixed demo users (`admin` + `demo`).
- `none`: migrations only.

Example:

- `sh deploy/scripts/init-db.sh correction`
- `sh deploy/scripts/init-db.sh evaluator_users`

## Demo accounts (optional seed)

If you run `evaluator_users` seed:

- `admin@camerfirma.com` / `Admin#2026Segura` (role `admin`)
- `demo@camerfirma.com` / `Demo#2026Segura` (role `user`)

## Quick smoke checks

After deploy and DB init:

- `sh deploy/scripts/smoke-check.sh https://deskbooking-yasin.duckdns.org`
