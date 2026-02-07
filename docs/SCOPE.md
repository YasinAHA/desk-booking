# Alcance

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
- Ver ocupacion por dia (sin datos personales por defecto).
- 15 puestos: Puesto 01..15 (configurable a futuro).

## No incluido
- Multi-idioma
- Reservas recurrentes
- Reservas por delegación
- Roles/admin UI
- SLA / soporte / guardias

## Nota
Piloto / best-effort. Si hay incidencias, se puede usar la app anterior.
