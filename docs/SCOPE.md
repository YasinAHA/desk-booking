# Alcance

## v0.1.0 (pilot inicial)
- UI base en vanilla JS.
- Autenticacion con magic link (skeleton).
- Supabase como backend (pre-migracion).

## v0.2.0 (piloto estable)
- Flujo de reservas estabilizado.
- Refresh y bloqueo de UI para evitar condiciones de carrera.
- RPCs en Supabase para ocupacion y reservas.

## v0.3.0 (backend base)
- Backend propio (Fastify + Postgres).
- Healthcheck operativo.
- Infra local con Docker (Postgres + seed inicial).
- Modulos de dominio creados (auth, desks, reservations) con estructura lista.
- Frontend minimo conectado a la API.
- Tests unitarios base para reservations y auth.

## v0.4.x - v0.9.x (consolidacion tecnica)
Linea de desarrollo para refinar arquitectura, seguridad y aspectos operacionales.

### v0.4.0 (Completed)
- Registro con confirmacion por email.
- Rate limiting y CORS.
- Migraciones y seeds versionadas.

### v0.5.0 (Current)
- ✅ Schema migration v1.0.0 (office/floor/zone/desk hierarchy).
- ✅ User names refactored (first_name/last_name/second_last_name, Spanish naming).
- ✅ Desk status enum (active/maintenance/disabled).
- ✅ Reservation metadata (source, office_id).
- ✅ Email outbox pattern with worker.
- ✅ SOLID/Clean Architecture refactor (domain → application → infrastructure → interfaces).
- ✅ 46 tests (auth, reservation, desk, repository, routes).

### v0.6.0-v0.9.0 (Planned)
- Seguridad y sesiones (refresh token cookie httpOnly).
- Roles y permisos administrativos.
- Auditoria y export de datos.
- Observabilidad y metricas.
- Admin UI basica.
- QR check-in.
- Calendario de festivos.

## v1.0.0 (Camerfirma Internal Release)
Release estable para uso interno en una unica organizacion.
- Single-org (una fila en `organization`).
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

## v2.0.0 (multi-organizacion / SaaS)
- Multi-org real con aislamiento por organization_id.
- Branding por organizacion.
- Roles y permisos mas granulares.
- Preparacion para planes/entitlements si aplica.

## No incluido (fuera de v1.0.0)
- Multi-idioma
- Reservas recurrentes
- Reservas por delegación
- SLA / soporte / guardias

## Nota
Piloto / best-effort. Si hay incidencias, se puede usar la app anterior.
