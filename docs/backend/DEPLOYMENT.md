# Deployment

Este documento resume el despliegue de correccion del TFM y referencia el flujo operativo actual.

## Entorno de correccion (actual)

- URL publica: `https://deskbooking-yasin.duckdns.org`
- Topologia: `caddy` (TLS + reverse proxy) + `frontend` + `backend` + `postgres` via Docker Compose.
- Origen de verdad para despliegue: `deploy/README.md`.

## Acceso para evaluacion

- Las credenciales de usuario demo y administrador se facilitan por correo al tutor.
- Si existe una incidencia puntual de login, el flujo de registro permanece habilitado en la UI.

## Variables clave

- Compose: `deploy/.env`
- Backend: `deploy/.env.backend`
- Frontend build-time: `deploy/.env.frontend` y `VITE_API_BASE_URL` en `deploy/.env`

Campos criticos:

- `APP_DOMAIN`
- `APP_BASE_URL`
- `FRONTEND_BASE_URL`
- `CORS_ORIGINS`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `POSTGRES_PASSWORD`

## Base de datos

- Migraciones: `db/migrations/001..006`
- Seeds recomendados para evaluacion:
  - `correction`
  - `evaluator_users`

Comandos:

```bash
sh deploy/scripts/init-db.sh correction
cat db/seeds/evaluator_users.sql | docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env exec -T postgres psql -U deskbooking -d deskbooking -v ON_ERROR_STOP=1 -f -
```

## Validacion post-deploy

```bash
sh deploy/scripts/smoke-check.sh https://deskbooking-yasin.duckdns.org
```

Checks minimos:

- `GET /health` -> `200`
- `POST /auth/register` -> `{"ok":true}`
- `POST /auth/login` con usuario confirmado (demo/admin) -> `200`

## Nota operativa

`/docs` (Swagger UI) no esta habilitado en `NODE_ENV=production` por configuracion del backend.
