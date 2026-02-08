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

## v1 (producto funcional)
- Reservar 1 escritorio por usuario y dia.
- Cancelar solo la propia reserva.
- Ver ocupacion por dia (incluye nombre del ocupante).
- 15 puestos: Puesto 01..15 (configurable a futuro).

## No incluido
- Multi-idioma
- Reservas recurrentes
- Reservas por delegación
- Roles/admin UI
- Escaneo de QR para confirmar reserva/asistencia
- SLA / soporte / guardias

## Versiones pendientes
- v0.4.x: hardening, calidad y seguridad.
- v0.5.0: refactor arquitectonico (SOLID/Clean Architecture).
- Roles y permisos: planned, sin UI por ahora.

## Nota
Piloto / best-effort. Si hay incidencias, se puede usar la app anterior.
