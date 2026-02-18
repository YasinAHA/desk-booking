# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [0.6.0] - 2026-02-18

### Changed
- Backend architecture refactor closed under layer-first + feature grouping, with composition roots consolidated in `backend/src/composition/*`.
- Application layer normalized to commands/queries/handlers by feature; legacy usecase facades removed.
- HTTP interface layer reorganized by feature with extracted schemas/mappers and consistent imports/naming.
- Documentation structure refined for monorepo maintenance; v0.6 execution plan archived in `docs/backend/archive/ARCHITECTURE-V0.6-PLAN.md`.
- AI guides aligned to current workflow (`next` integration flow, quality gates, and versioned docs closure).

### Fixed
- Reservation conflict messaging differentiated between desk conflict and user/day conflict scenarios.
- Transaction context usage hardened in application ports and transactional factories.
- Auth confirm-email flow upgraded to semantic outcomes (`confirmed | invalid_token | expired | already_confirmed`).

### Tests
- Backend quality gates validated for release:
  - `npm -w backend run lint` OK
  - `npm -w backend run lint:types` OK
  - `npm -w backend run build` OK
  - `npm -w backend run test` OK (`63/63`)

### Notes
- v0.6.0 closes the backend architecture stabilization cycle.
- Password recovery/change functionality is planned for v0.7.0 (tracked in `docs/backend/TASKS.md`).

---

## [0.5.1] - 2026-02-16

### Changed
- Backend naming convention refactor to `kebab-case` across ports, repositories, policies, security modules, HTTP interfaces, and workers.
- Imports normalized using path aliases (`@domain`, `@application`, `@infrastructure`, `@interfaces`, `@config`).
- Documentation consistency pass in `docs/` (API, tooling, known issues, scope, security, prompts, backlog/tasks alignment).

### Fixed
- Resolved broken intra-doc links in `docs/`.
- Documented `POST /auth/refresh` in API contract.
- Unified test-count references to current backend suite (`55 tests`).
- Corrected cross-doc contradictions in DB delete strategy notes (`RESTRICT/CASCADE/SET NULL`).

### Notes
- v0.5.1 remains focused on maintainability/refactor hygiene (no major feature scope changes).
- Release closure checklist tracked in `docs/TASKS.md`.

---

## [0.5.0] - 2026-02-15

### Added
- Schema migration v1.0.0: office/floor/zone/desk hierarchy (configurable by admin)
- User profile refactor: first_name + last_name + second_last_name (Spanish naming convention)
- Desk status enum: active, maintenance, disabled (replaced is_active boolean)
- Reservation metadata: source (user/admin/walk_in/system) and office_id fields
- Email outbox pattern with worker polling (3s interval, exponential backoff)
- Security hardening: Helmet 13.0.2 with CSP (Content-Security-Policy) + HSTS headers
- Password policy enforcement: 12+ chars, uppercase, lowercase, digit, special char (!@#$%^&*-_+=)
- Password policy Value Object with domain-level validation + comprehensive unit tests
- Frontend client-side password validation with live requirements checklist (✓/✗ indicators)
- Comprehensive SECURITY.md documentation: Security by Design + Security by Default principles
- 55 backend tests (+password policy +security +auth +reservation +desk +repository +routes)
- Architecture refactor: SOLID/Clean Architecture (domain → application → infrastructure → interfaces)
- Domain-driven error handling: typed exceptions mapped in HTTP layer

### Changed
- API serialization: snake_case responses, camelCase form inputs
- User authentication: passwordHash value object with Argon2 validation + password policy enforcement
- Reservation queries: CQRS pattern for command/query separation
- Frontend form: split display_name into first_name, last_name, second_last_name fields
- Frontend form: password input now shows requirements checklist with real-time validation feedback
- Frontend API client: updated signatures for register() and createReservation()
- Frontend error handling: added WEAK_PASSWORD error code with user-friendly message
- Docker: Mailpit SMTP server for local email testing
- JWT_REFRESH_SECRET: now required in production (safe default in dev/test)

### Fixed
- Email delivery pipeline: outbox worker constraint now allows 'processing' status (concurrency lock)
- Schema migration 004: idempotent guards for constraints, column renames, and seed data
- Reservation uniqueness: enforced by DB unique constraints per user-desk-date
- Test fixtures: all 55 tests passing with new user naming conventions + password policy tests
- Password validation: moved from HTTP layer to domain Value Object for better separation of concerns

### Security
- ✅ HTTP security headers (Helmet with CSP + HSTS) enabled
- ✅ Password policy enforcement with complexity requirements
- ✅ JWT_REFRESH_SECRET production enforcement
- ✅ Security documentation with design principles (see SECURITY.md)
- ⏳ Known gaps (v0.6.0+): httpOnly cookies, CSRF tokens, audit logging, 2FA

### Notes
- v0.5.0 is part of v0.4.x-v0.9.x technical consolidation phase (see SCOPE.md)
- Security hardening phase 1 complete (headers + password policy + documentation)
- v0.5.1 (planned): naming convention refactor (kebab-case files for backend)
- Admin UI and QR check-in postponed for v0.7.0
- Multi-language and recurring reservations postponed for v2.0.0

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
