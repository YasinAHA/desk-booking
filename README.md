# Desk Booking Platform

Plataforma interna de reserva de escritorios para entorno corporativo. El proyecto forma parte de un TFM y evoluciona con foco en arquitectura mantenible, seguridad y operacion real.

Estado del repo: `v0.5.x` (consolidacion tecnica y refactor por capas).

## Objetivo

- Backend desacoplado (Clean Architecture + SOLID).
- Persistencia en PostgreSQL con migraciones y seeds por entorno.
- Autenticacion JWT con access/refresh token.
- Confirmacion de email con patron outbox + worker asincrono.
- Base de seguridad y observabilidad para endurecimiento en `v0.6.0+`.

## Estructura

```text
desk-booking/
|-- backend/
|-- db/
|-- docker/
|-- docs/
|-- frontend/
|-- CHANGELOG.md
`-- README.md
```

## Stack

- Backend: Node.js, Fastify, TypeScript, PostgreSQL, Zod, Argon2, JWT.
- Infra local: Docker Compose (Postgres, pgAdmin, Mailpit, backend y outbox-worker).
- Frontend: HTML/CSS/JS vanilla.

## Requisitos

- Node.js LTS
- npm
- Docker + Docker Compose

## Arranque rapido

### Opcion A: local mixto (DB en Docker, API desde host)

1. Instalar dependencias:

```bash
npm install
```

2. Levantar servicios Docker:

```bash
npm run dev:db
```

3. Configurar entorno:

- Copiar `backend/.env.example` a `backend/.env`.
- Ajustar como minimo: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ALLOWED_EMAIL_DOMAINS`, `CORS_ORIGINS`.

4. Migrar y poblar datos:

```bash
npm run db:migrate
npm run db:seed:dev
```

5. Ejecutar API desde host:

```bash
npm run dev:api
```

6. Verificar:

- Healthcheck: `GET http://localhost:3001/health`
- Metricas: `GET http://localhost:3001/metrics`
- Mailpit UI: `http://localhost:8025`

### Opcion B: Docker completo

`npm run dev:db` tambien levanta `backend` y `outbox-worker` en contenedores segun `docker/docker-compose.yml`.

## Scripts utiles

En raiz:

- `npm run dev:db`
- `npm run dev:api`
- `npm run db:migrate`
- `npm run db:seed:dev`
- `npm run db:seed:test`
- `npm run db:seed:correction`

En backend:

- `npm -w backend run dev`
- `npm -w backend run test`
- `npm -w backend run build`
- `npm -w backend run start`
- `npm -w backend run worker:outbox`

## API (resumen)

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/verify`
- `POST /auth/logout`
- `GET /auth/confirm?token=...`
- `GET /desks?date=YYYY-MM-DD`
- `POST /reservations`
- `DELETE /reservations/:id`
- `GET /reservations/me`
- `GET /health`
- `GET /metrics`

Contrato detallado: [docs/API.md](docs/API.md)

## Variables de entorno clave

Ademas de las tipicas (`DATABASE_URL`, `JWT_SECRET`), el backend usa:

- `HOST`, `PORT`, `DB_SSL`, `DB_POOL_MAX`
- `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRATION`, `JWT_ISSUER`, `JWT_AUDIENCE`
- `EMAIL_MODE`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `OUTBOX_POLL_INTERVAL_MS`, `OUTBOX_BATCH_SIZE`, `OUTBOX_MAX_ATTEMPTS`, `OUTBOX_BACKOFF_BASE_MS`, `OUTBOX_BACKOFF_MAX_MS`
- `APP_BASE_URL`, `CORS_ORIGINS`, `ALLOWED_EMAIL_DOMAINS`

Referencia completa: `backend/.env.example`

## Documentacion principal

- Arquitectura: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- API: [docs/API.md](docs/API.md)
- Seguridad: [docs/SECURITY.md](docs/SECURITY.md)
- Tooling: [docs/TOOLING.md](docs/TOOLING.md)
- Deployment: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- Tareas: [docs/TASKS.md](docs/TASKS.md)
- Backlog: [docs/BACKLOG.md](docs/BACKLOG.md)
- Issues conocidos: [docs/KNOWN-ISSUES.md](docs/KNOWN-ISSUES.md)

## Autor

Yassine Ait El Hadj Ahajtan

## Licencia

MIT
