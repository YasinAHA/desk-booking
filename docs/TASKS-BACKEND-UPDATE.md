# Backend update checklist (temporary)

## Scope
- Align backend with v1.0.0 schema changes (users, desks, reservations, policies, audit).

## 0) Inventory and impact map
- [x] Search for legacy columns: reserved_date, is_active, display_name.
- [x] List affected files (repos, tests, DTOs, mappers, domain models).
- [x] Capture required field additions: reservations.office_id, reservations.source, users.first_name/last_name/second_last_name, desks.status, organizations.email_domain.

### Inventory results (legacy usages found)
- backend/src/interfaces/http/auth/auth.controller.ts
- backend/src/interfaces/http/auth/auth.routes.test.ts
- backend/src/interfaces/http/desks/desks.routes.test.ts
- backend/src/interfaces/http/reservations/reservations.routes.test.ts
- backend/src/infrastructure/repositories/pgDeskRepository.ts
- backend/src/infrastructure/repositories/pgDeskRepository.test.ts
- backend/src/infrastructure/repositories/pgReservationCommandRepository.ts
- backend/src/infrastructure/repositories/pgReservationQueryRepository.ts
- backend/src/infrastructure/repositories/pgReservationQueryRepository.test.ts
- backend/src/infrastructure/repositories/pgUserRepository.ts
- backend/src/infrastructure/repositories/pgUserRepository.test.ts

## 1) Domain model updates
- [x] User entity/value objects: replace display_name with first_name, last_name, second_last_name (nullable).
- [x] Desk entity: replace is_active with status enum (active/maintenance/disabled).
- [x] Reservation entity: rename reserved_date -> reservation_date and add office_id + source.
- [x] Update any domain validation rules impacted by new fields.

## 2) DTOs + validation
- [x] Update request/response DTOs for users (first/last/second_last).
- [x] Update reservation DTOs to include reservation_date, office_id (if needed), source.
- [x] Update desk DTOs to expose status instead of is_active.
- [x] Validate source field values: user/admin/walk_in/system.

## 3) Repository layer (PG)
- [x] Reservations queries: reserved_date -> reservation_date.
- [x] Desks queries: is_active -> status (filter active).
- [x] Users queries: display_name -> first_name/last_name/second_last_name.
- [x] Include office_id in reservation reads (insert relies on trigger).
- [x] Ensure indexes and filters match new status values.

## 4) Use cases and services
- [x] Auth / user flows: update user creation and responses.
- [x] Desk use cases: status transitions and filtering.
- [x] Reservation flows: support source, office_id, new status transitions.
- [x] Email confirmation / verification: ensure queries still match updated schema.

## 5) Tests and fixtures
- [x] Update factories/fixtures to provide new required fields.
- [x] Update unit tests for renamed fields and status enums.
- [x] Update repository tests to assert new columns and query behavior.

## 6) Verification
- [x] Run backend tests (npm -w backend run test).
- [x] Fix failing tests and re-run.

## Notes
- Keep mapping rules aligned with db/migrations/004_v1_schema.sql.
- Use CITEXT email semantics (case-insensitive) when needed.
- Reservations.office_id can be null on input (trigger completes it) but should be returned in reads.
