# Alcance

## v0.1.0 (pilot inicial)
- UI base en vanilla JS.
- Autenticación con magic link (skeleton).
- Supabase como backend (pre-migración).

## v0.2.0 (piloto estable)
- Flujo de reservas estabilizado.
- Refresh y bloqueo de UI para evitar condiciones de carrera.
- RPCs en Supabase para ocupacion y reservas.

## v0.3.0 (backend base)
- Backend propio (Fastify + Postgres).
- Healthcheck operativo.
- Infra local con Docker (Postgres + seed inicial).
- Módulos de dominio creados (auth, desks, reservations) con estructura lista.
- Frontend mínimo conectado a la API.
- Tests unitarios base para reservations y auth.

## v0.4.x - v0.9.x (consolidación técnica)
Linea de desarrollo para refinar arquitectura, seguridad y aspectos operacionales.

### v0.4.0 (Completed)
- Registro con confirmacion por email.
- Rate limiting y CORS.
- Migraciones y seeds versionadas.

### v0.5.0 (Completed)
- [x] Schema migration v1.0.0 (office/floor/zone/desk hierarchy).
- [x] User names refactored (first_name/last_name/second_last_name, Spanish naming).
- [x] Desk status enum (active/maintenance/disabled).
- [x] Reservation metadata (source, office_id).
- [x] Email outbox pattern with worker.
- [x] SOLID/Clean Architecture refactor (domain -> application -> infrastructure -> interfaces).
- [x] 63 tests al cierre de v0.6.0 (auth, reservation, desk, repository, routes).

### v0.6.0 (Completed)
- [x] Refactor arquitectónico por capas + agrupación por feature completado.
- [x] Composition root consolidado en `backend/src/composition/*`.
- [x] Interfaces HTTP reestructuradas por feature con schemas/mappers.
- [x] Criterios de aceptación de calidad cerrados (`lint`, `lint:types`, `build`, `test`).
- [x] 65 tests actuales tras hardening inicial de v0.7.0.

### v0.7.0-v0.9.0 (Planned)
- Seguridad y sesiones (refresh token cookie httpOnly).
- Roles y permisos administrativos.
- Auditoria y export de datos.
- Observabilidad y metricas.
- Admin UI basica.
- QR check-in.
- Calendario de festivos.

## v1.0.0 (Camerfirma Internal Release)
Release estable para uso interno en una unica organización.
- Single-org (una fila en `organizations`).
- Office -> (Floor) -> (Zone) -> Desk, configurables por admin.
- Estados de desk: active, maintenance, disabled.
- Reserva por dia (DATE) con una reserva activa por usuario y desk.
- QR check-in con ventana configurable por office.
- No_show libera el desk; walk-in permitido si esta libre.
- Policies en DB con fallback organization/office.
- Admin UI y roles minimos (user/admin).
- Auditoria minima (eventos de reservas y acciones admin).
- Informes basicos (ocupacion, no_show, bloqueos).

## v1.x (mejoras internas)
- Turnos (slot_id) o media jornada.
- Preferencias de usuario (zona favorita, puesto favorito).
- Calendario de festivos o dias no reservables.
- Notificaciones reales via outbox worker.

## v2.0.0 (multi-organización / SaaS)
- Multi-org real con aislamiento por organization_id.
- Branding por organización.
- Roles y permisos más granulares.
- Preparacion para planes/entitlements si aplica.

## No incluido (fuera de v1.0.0)
- Multi-idioma
- Reservas recurrentes
- Reservas por delegacion
- SLA / soporte / guardias

## Nota
Piloto / best-effort. Si hay incidencias, se puede usar la app anterior.

## Reglas operativas (normativas) para QR y walk-in
- El QR de cada mesa es fijo (`qr_public_id` estable por desk) y está pensado para uso físico permanente.
- Si un QR se regenera, el QR anterior queda inválido de forma inmediata y debe sustituirse la pegatina física.
- El check-in por QR requiere reserva válida del usuario para ese desk y esa fecha, dentro de la ventana de check-in definida por política.
- Si no se realiza check-in antes de `checkin_cutoff_time`, la reserva debe pasar a `no_show`.
- Una reserva en `no_show` libera el desk para `walk_in` en esa fecha.
- `walk_in` solo está permitido cuando no existe reserva activa (`reserved`/`checked_in`) para ese desk y fecha.


