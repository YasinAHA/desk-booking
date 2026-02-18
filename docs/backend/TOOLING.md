# Tooling

Guia rapida del tooling y scripts del proyecto.

## Requisitos base
- Node.js LTS
- npm
- Docker (para Postgres local y Mailpit)

## Workspaces
- Monorepo con npm workspaces.
- Paquetes actuales:
  - backend

## Scripts principales (raíz)
- `npm install`
- `npm run dev:db` (Postgres + servicios locales vía Docker)
- `npm run dev:api` (API en modo dev)
- `npm run db:migrate`
- `npm run db:seed:dev`

## Scripts backend
- `npm -w backend run dev`
- `npm -w backend run test`
- `npm -w backend run build`
- `npm -w backend run start`
- `npm -w backend run db:migrate`
- `npm -w backend run db:seed -- <dev|test|correction>`

## Docker (local)
- `docker/docker-compose.yml`
  - Postgres
  - pgAdmin
  - Mailpit (SMTP + UI)
  - backend
  - outbox-worker

## Variables de entorno
- `backend/.env` desde `backend/.env.example`
- Clave: `DATABASE_URL`, `JWT_SECRET`, `ALLOWED_EMAIL_DOMAINS`
- `NODE_ENV`: `development`, `test`, `production`
- `APP_BASE_URL`, `CORS_ORIGINS`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

## Testing
- Runner: Node test via `tsx`
- Alcance: tests unitarios y de rutas en `backend/src/**/*.test.ts`

## Migraciones y seeds
- Migraciones en `db/migrations`
- Seeds por entorno en `db/seeds`

## CI
- GitHub Actions: test + build en pushes/PR a `main` y `next`
- Workflow: `.github/workflows/ci.yml`

## Deployment
- Ver [DEPLOYMENT.md](DEPLOYMENT.md)

