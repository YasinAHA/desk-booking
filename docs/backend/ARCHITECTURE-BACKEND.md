# Arquitectura

## Vision general
Monorepo con backend propio y frontend ligero:
- Backend: Fastify + TypeScript + Postgres.
- Frontend: HTML/CSS/JS (con migración a TypeScript planificada).

## Componentes

### Backend (`backend/`)
- `src/server.ts`: bootstrap del servidor HTTP.
- `src/app.ts`: construye la app Fastify, registra plugins y rutas.
- `src/interfaces/http/plugins/db.ts`: pool de Postgres y decorador `app.db`.
- `src/interfaces/http/types/*`: tipos y augmentations para Fastify.
- `src/config/env.ts`: configuración compartida (env) usada por varias capas.
- `src/interfaces/http/*`: rutas HTTP por feature (auth, desks, reservations).
- `src/interfaces/http/*/*.container.ts`: wiring por feature (composition root).

### Capas (v0.5.0)
- `src/domain`: entidades y reglas de negocio puras (User, Desk, Reservation).
- `src/application`: orquestacion por feature (commands, queries, handlers, ports, services).
- `src/infrastructure`: adaptadores (DB, mailer, logger, etc.).
- `src/interfaces`: entrada/salida (HTTP/controllers, DTOs, validación).

### Guardrails de arquitectura
- `application` solo depende de `domain` y `ports`.
- `usecases` no dependen de otros usecases.
- Errores de negocio se modelan como tipos en `domain` y se traducen en `interfaces`.
- Serialización/formatos se resuelven en `infrastructure`.
- Constantes de negocio y límites compartidos en `src/config/constants.ts`.

### CQRS (criterio pragmatica)
- CQRS estricto solo se aplica cuando hay lecturas complejas o proyecciones.
- En v1 se usa separacion comando/consulta donde aporta claridad (reservations).
- En otras entidades se mantiene repositorio unificado para evitar complejidad.

### Frontend (`frontend/`)
- `index.html`, `styles.css`: UI base.
- `src/*`: login, listado de desks y reservas/cancelaciones.

### Base de datos
- Postgres local vía Docker.
- SQL de inicializacion en `docker/postgres/init/001_init.sql`.

### Outbox Pattern (side effects)
- Cambios críticos se persisten en una sola transaccion junto con el outbox.
- Un worker procesa la cola y reintenta envios (email) sin bloquear el flujo principal.
- El dominio no conoce el outbox; la aplicación usa ports.
- La infraestructura implementa los adaptadores y el worker.

## Datos (alto nivel)
- `users`
- `desks`
- `reservations`

## Seguridad
- Auth con JWT (backend).
- Dominio permitido por email (`ALLOWED_EMAIL_DOMAINS`).
- Confirmacion por email en registro.
- Restricciones de integridad en DB (índices unicos por dia).

## Observabilidad
- Logs estructurados por request con `request id`.
- Trazas basicas en operaciones criticas (auth y reservas).
- Metricas basicas in-memory expuestas en `GET /metrics`.

## API (contrato base)
- Auth con `Authorization: Bearer <token>`.
- Endpoints principales: `POST /auth/login`, `POST /auth/verify`, `POST /auth/logout`.
- Desks: `GET /desks?date=YYYY-MM-DD`.
- Reservations: `POST /reservations`, `DELETE /reservations/:id`, `GET /reservations/me`.
- Errores con formato comun `{ error: { code, message } }`.

## Notas de evolución
- Rutas HTTP delgadas en `interfaces/http/`, con lógica en `application/<feature>`.
- Entidades base en `domain/` para evolucionar reglas de negocio.
- Migración por capas en curso (v0.5.0).


