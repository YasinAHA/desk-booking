# ADR-0004: Migrations as Single Source of Truth

- Status: Accepted
- Date: 2026-02-17
- Scope: backend

## Context
La coexistencia de SQL de bootstrap con definicion de esquema de negocio puede causar drift entre entornos.

## Decision
- `db/migrations` se define como fuente única de verdad para esquema de negocio.
- `docker/postgres/init` se limita a bootstrap mínimo:
  - extensiones (ej. `pgcrypto`, `citext`)
  - roles/permisos solo si aplica
- No crear tablas de negocio en `docker init`.

## Consequences
- Menor riesgo de inconsistencias entre local/CI/producción.
- Mayor trazabilidad de cambios de esquema.

