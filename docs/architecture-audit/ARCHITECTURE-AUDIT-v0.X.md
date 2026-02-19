# Architecture Audit Report (v0.X)

Last review baseline: 2026-02-19  
Status legend: `Resolved` | `Partial` | `Open`

## 1) Executive Summary
- General architectural health: **Moderate → Improving**.
- Main open risks:
  - Domain model remains partially anemic (`Desk`, `Reservation` are still type aliases).
  - Reservation command flow still uses check-then-write without an explicit app-level transaction.
  - Type-safety debt remains in repositories and Fastify DB typings (`any`, `Promise<any>`).
- Main resolved risks since previous draft:
  - JWT TTL/config dependency is now injected in composition (no direct `env` in token service).
  - JWT verification now uses `unknown` + type guards and avoids `as unknown as`.

## 2) Findings (Current Status)

### High
- `backend/src/domain/desks/entities/desk.ts:12`
  - Status: `Open`
  - Finding: `Desk` is a plain type alias, no behavior/invariant methods.

- `backend/src/domain/reservations/entities/reservation.ts:16`
  - Status: `Open`
  - Finding: `Reservation` is a plain type alias; lifecycle rules are not encapsulated in an entity class.

- `backend/src/application/reservations/commands/create-reservation.handler.ts:48`
  - Status: `Resolved`
  - Finding: application-level explicit transaction boundary has been introduced for check-then-write flow.

### Medium
- `backend/src/application/reservations/commands/create-reservation.handler.ts:35`
  - Status: `Resolved`
  - Finding: invalid vs past reservation date errors are now separated and mapped explicitly in HTTP.

- `backend/src/domain/reservations/value-objects/reservation-date.ts:13`
  - Status: `Open`
  - Finding: documented `YYYY-MM-DD` format is not strictly enforced (accepts non-zero-padded date parts).

- `backend/src/interfaces/http/auth/auth.controller.ts:62`
  - Status: `Partial`
  - Finding: controller still orchestrates token lifecycle directly (refresh/revoke/issue), despite cleaner token service internals.

- `backend/src/interfaces/http/auth/jwt-token.service.ts`
  - Status: `Partial`
  - Finding: improved internals (typed errors/guards/injected config), but service ownership is still under `interfaces/http`.

- `backend/src/application/common/ports/transaction-manager.ts:8`
  - Status: `Open`
  - Finding: port still leaks SQL-shaped API and `Promise<any>`.

- `backend/src/infrastructure/auth/repositories/pg-user-repository.ts:23`
  - Status: `Open`
  - Finding: repository mapping still relies on `any` row typing.

- `backend/src/infrastructure/reservations/repositories/pg-reservation-command-repository.ts:18`
  - Status: `Open`
  - Finding: repository DB rows still typed as `any[]`.

### Low
- `backend/src/app.ts:63`
  - Status: `Open`
  - Finding: `(req as any).body` mutation in preValidation.

- `backend/src/infrastructure/auth/repositories/pg-token-revocation-repository.ts:23`
  - Status: `Open`
  - Finding: generic `Error` usage instead of typed infrastructure error.

- `backend/src/application/auth/queries/login.handler.ts:26`
  - Status: `Open`
  - Finding: read query wrapped in transaction manager (discutible; likely unnecessary).

- `backend/src/interfaces/http/auth/adapters/fastify-jwt-provider.ts:14`
  - Status: `Partial`
  - Finding: `as any` remains in adapter layer (contained and acceptable for now).

- `backend/src/interfaces/http/types/fastify.d.ts:26`
  - Status: `Open`
  - Finding: `db.query` still exposed as `Promise<any>`.

## 3) Delta Since Previous Audit

### Resolved
- Removed direct `env` dependency from token service internals by injecting TTL config through composition.
- Replaced token payload unsafe casts with explicit `unknown` handling and type guards.
- Added typed token errors (`InvalidTokenError`, `RevokedTokenError`) in JWT service path.
- Added explicit transaction boundary in `CreateReservationHandler` (checks + create within one tx unit).
- Split reservation date error semantics (`DATE_INVALID` vs `DATE_IN_PAST`) in application/domain and HTTP mapping.

### Still Pending
- Ownership move of token lifecycle orchestration from HTTP layer to application boundary.
- Domain entity enrichment (`Desk`, `Reservation`) and stricter date semantics.
- Repository and framework typing hardening (`any` removal).

## 4) Actionable Task Pack (to track in TASKS)

### P0

### P1
- Harden repository row typing (auth/reservations/desks): remove `any` and unsafe assertions.
- Strengthen `transaction-manager` port typing to remove SQL-shaped leakage and `Promise<any>`.
- Move auth token lifecycle orchestration ownership to `application/auth` handler/service boundary.

### P2
- Replace generic infra errors in token revocation repo with typed errors carrying `cause`.
- Remove `(req as any).body` in Fastify preValidation via typed parser/content-type strategy.
- Evaluate removing tx wrapper from `LoginHandler` read path unless consistency requirement is documented.

### P3
- Add focused concurrency/regression tests for reservation transaction semantics.
- Add architecture guard checks in CI (import boundary/layer rules).

## 5) Golden Rules (Current)
- Keep dependencies inward: `interfaces -> application -> domain`.
- Keep domain/application free from framework and infra details.
- Avoid `any`/`Promise<any>` in layer contracts.
- Use typed errors for domain/application/infra boundaries.
- Preserve HTTP contracts while refactoring internals incrementally.

## 6) Governance
- Este fichero es la fuente viva para hallazgos arquitectónicos detectados durante implementación.
- Cada hallazgo nuevo debe registrarse aquí con estado (`Open`, `Partial`, `Resolved`) antes de abrir tarea técnica.
- `docs/backend/TASKS.md` solo debe contener ejecución de mejoras concretas, no tareas meta abiertas.
