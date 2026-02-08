# Arquitectura

## Vision general
Monorepo con backend propio y frontend ligero:
- Backend: Fastify + TypeScript + Postgres.
- Frontend: HTML/CSS/JS (con migracion a TypeScript planificada).

## Componentes

### Backend (`backend/`)
- `src/server.ts`: bootstrap del servidor HTTP.
- `src/app.ts`: construye la app Fastify, registra plugins y rutas.
- `src/plugins/db.ts`: pool de Postgres y decorador `app.db`.
- `src/config/env.ts`: lectura y validacion de variables de entorno.
- `src/modules/*`: modulos por dominio (auth, desks, reservations).

### Frontend (`frontend/`)
- `index.html`, `styles.css`: UI base.
- `src/*`: login, listado de desks y reservas/cancelaciones.

### Base de datos
- Postgres local via Docker.
- SQL de inicializacion en `docker/postgres/init/001_init.sql`.

## Datos (alto nivel)
- `users`
- `desks`
- `reservations`

## Seguridad
- Auth con JWT (backend).
- Dominio permitido por email (`ALLOWED_EMAIL_DOMAINS`).
- Confirmacion por email en registro.
- Restricciones de integridad en DB (indices unicos por dia).

## Observabilidad
- Logs estructurados por request con `request id`.
- Trazas basicas en operaciones criticas (auth y reservas).

## API (contrato base)
- Auth con `Authorization: Bearer <token>`.
- Endpoints principales: `POST /auth/login`, `POST /auth/verify`, `POST /auth/logout`.
- Desks: `GET /desks?date=YYYY-MM-DD`.
- Reservations: `POST /reservations`, `DELETE /reservations/:id`, `GET /reservations/me`.
- Errores con formato comun `{ error: { code, message } }`.

## Notas de evolucion
- Rutas y servicios base implementados.
- Migracion a TypeScript en frontend queda para v0.4.0.
