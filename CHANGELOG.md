# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [0.4.0] - 2026-02-08

### Added
- Registro con confirmacion por email y verificacion de sesion en frontend
- Mailpit para SMTP local
- Rate limiting en endpoints sensibles
- CORS restringido por origen
- CI basico con GitHub Actions (test + build)
- Observabilidad basica con request id y trazas en auth/reservas
- Migraciones versionadas y seeds por entorno
- Guia de tooling y despliegue

### Changed
- Frontend con registro, estado global de carga y mensajes de error guiados
- Estado de desks con nombre del ocupante cuando aplica

### Fixed
- Bloqueo de cancelacion de reservas pasadas

### Known Issues
- Tokens en localStorage sin refresh token ni cookie httpOnly (riesgo XSS)

## [0.3.0] - 2026-02-07

### Added
- Backend propio con Fastify + TypeScript
- Auth JWT con login y verificacion de token
- Endpoints base: health, auth, desks, reservations
- Postgres local via Docker y schema inicial
- Frontend minimo para login, reservas y cancelaciones
- Tests unitarios base para reservations y auth

### Changed
- Migracion de Supabase a backend propio
- Contrato API documentado con schemas y errores

### Fixed
- Correccion de fechas en reservas (sin desfase por zona horaria)

## [0.2.0] - 2026-02-07

Release tag: `v0.2.0` ("Stable pilot: desk reservations flow").

### Added
- Desk reservation and cancellation via Supabase RPC functions
- Magic link authentication with session persistence
- Manual and automatic refresh of desk occupancy and user reservations
- Basic UI locking to prevent concurrent actions

### Changed
- Simplified action and refresh flow to avoid race conditions
- Centralized session rehydration using Supabase auth state
- Improved logging and debugging for fetch, auth, and refresh lifecycle

### Fixed
- UI freezes when switching browser tabs or applications
- Grid remaining locked after failed or interrupted actions
- Multiple overlapping refresh calls causing inconsistent state

### Known Issues
- Desk grid may not render in edge cases after auth until a manual refresh
- Further simplification of state handling is planned for next iteration

---

## [0.1.0] - 2026-01-01

Release tag: `v0.1.0` ("base UI + magic link skeleton").

### Added
- Initial desk reservation pilot
- Supabase project setup
- Basic UI layout and date selection
- Initial Supabase migrations and seed desks
