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
- `src/composition/*.container.ts`: wiring por feature (composition root).

### Capas (v0.6.x)
- `src/domain`: entidades y reglas de negocio puras (User, Desk, Reservation).
- `src/application`: orquestacion por feature (commands, queries, handlers, ports, services).
- `src/infrastructure`: adaptadores (DB, mailer, logger, etc.).
- `src/interfaces`: entrada/salida (HTTP/controllers, DTOs, validación).

### Guardrails de arquitectura
- `application` solo depende de `domain` y `ports`.
- `handlers`/servicios de `application` no dependen de `interfaces` ni de `infrastructure`.
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
- Migraciones SQL como fuente de verdad en `db/migrations/`.
- Bootstrap Docker mínimo (extensiones/roles si aplica), sin tablas de negocio.

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

## Reglas normativas de check-in QR
- `qr_public_id` de `desks` es estable (QR fijo por mesa) y se considera identificador público operativo.
- La regeneración de `qr_public_id` es una acción administrativa excepcional y debe invalidar inmediatamente el QR anterior.
- Tras regeneración de `qr_public_id`, es obligatorio reemplazar la señalética física del desk.
- `POST /reservations/check-in/qr` solo es válido si existe una reserva del usuario para el desk y la fecha, con estado activo (`reserved`).
- La ventana de check-in se evalúa con la política de oficina (`checkin_allowed_from`, `checkin_cutoff_time`) y timezone de la oficina.
- Si una reserva permanece en `reserved` y supera `checkin_cutoff_time`, debe transicionar a `no_show`.
- Una reserva en `no_show` deja de ser activa y el desk pasa a ser elegible para `walk_in`.
- `walk_in` solo es válido si no existe reserva activa (`reserved`/`checked_in`) para el desk en la fecha y el usuario no acapara otra reserva activa incompatible.

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
- Refactor por capas y por feature completado en v0.6.x (detalle histórico en `docs/backend/archive/ARCHITECTURE-V0.6-PLAN.md`).
- Seguimiento de deuda arquitectónica activa en `docs/architecture-audit/ARCHITECTURE-AUDIT-v0.X.md` y aterrizado en `docs/backend/TASKS.md`.

## Seguimiento de mejoras arquitectónicas
- Cualquier mejora detectada durante implementación se registra primero en:
  - `docs/architecture-audit/ARCHITECTURE-AUDIT-v0.X.md` (hallazgos + estado).
  - `docs/backend/TASKS.md` (si requiere ejecución en iteración activa).
- Las mejoras cerradas se reflejan en este documento como estado consolidado de arquitectura backend.
- Evitar tareas meta abiertas en `TASKS` sin aterrizar en hallazgos concretos.


