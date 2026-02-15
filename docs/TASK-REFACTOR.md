# Refactor Task List

Objective: consolidate Clean Architecture and SOLID tasks into a single checklist. Ordered by dependency direction (DIP) and practical impact.

## Phase 1: Dependency direction and boundaries (DIP first)
- [x] Remove config imports from application layer; inject policies via constructors.
- [x] Add `AuthPolicy` interface in application and provide implementation in composition root.
- [x] Split ports by responsibility:
  - [x] `UserRepository` and `EmailVerificationRepository`.
  - [x] `ReservationCommandRepository` and `ReservationQueryRepository`.
- [x] Replace infra-centric DTOs in ports with domain/app DTOs.
- [x] Introduce value objects: `UserId`, `DeskId`, `ReservationId`, `Email`, `ReservationDate`, `PasswordHash`.

## Phase 2: Application flow and consistency
- [x] Add transaction helper to DB adapter and use it in multi-step flows.
- [x] Introduce outbox/queue for email confirmation sending.
- [x] Move DB error translation out of repositories into application mapping.
- [x] Split `AuthUseCase` into orchestrator + `EmailVerificationService`.
- [~] Keep domain entities behavioral (User done, Desk/Reservation kept as types):
  - [x] `User.isConfirmed()`, `User.confirmEmail()`, `User.updateCredentials()` - **fully integrated in AuthUseCase**
  - [-] `Reservation` - kept as type (queries return DTOs, not entities)
  - [-] `Desk` - kept as type (queries return DTOs, not entities)
  - **Note:** Desk and Reservation will become classes when CQRS pattern is completed with command repositories returning full entities

## Phase 3: HTTP boundary hygiene
- [x] Remove manual `JSON.parse` from HTTP routes (added `preValidation` hook in app.ts).
- [x] Create reusable date schema from `ReservationDate` value object (created `interfaces/http/schemas/dateSchemas.ts`, used in all routes).
- [x] Centralize rate-limit policy in a shared plugin (created `interfaces/http/policies/rateLimitPolicies.ts`).
- [x] Extract `AuthController` to isolate validation, mapping, and response shaping (created `interfaces/http/auth/auth.controller.ts`).
  - [x] **DeskController** - created for architectural consistency (`interfaces/http/desks/desks.controller.ts`)
  - [x] **ReservationController** - created for architectural consistency (`interfaces/http/reservations/reservations.controller.ts`)
  - All route handlers now use class-based controllers for: uniform error mapping, centralized logging, consistent request validation
- [x] Move JWT creation into `JwtTokenService` adapter (created `interfaces/http/auth/jwt-token.service.ts`).
  - Decouples HTTP layer from Fastify jwt plugin
  - Centralizes token payload structure
  - Easier to test and maintain
- [x] Protect `/metrics` endpoint with authentication (requires valid JWT token).

## Phase 4: Security hardening
- [x] Add JWT expiration, issuer, audience; implement refresh token rotation.
  - [x] JWT_EXPIRATION env var (15m default for access tokens)
  - [x] JWT_REFRESH_SECRET for separate refresh token signing
  - [x] JWT_REFRESH_EXPIRATION env var (7d default)
  - [x] JWT_ISSUER claim (desk-booking)
  - [x] JWT_AUDIENCE claim (desk-booking-api)
  - [x] POST /refresh endpoint implemented in auth.routes.ts
  - [x] Login now returns both `accessToken` and `refreshToken`
- [x] Add token revocation strategy (`jti` blacklist with DB).
  - [x] Added JTI (JSON Web Token ID) to all tokens via randomUUID()
  - [x] Created `db/migrations/003_token_revocation.sql` (jti blacklist table)
  - [x] Created `TokenRevocationRepository` port interface
  - [x] Created `PgTokenRevocationRepository` PostgreSQL implementation
  - [x] Updated `JwtTokenService.verifyAccessToken()` to check revocation blacklist
  - [x] Implemented `jwtTokenService.revoke()` method for logout/token expiration
- [x] Code quality refactor: Dependency Inversion via adapter pattern
  - [x] Created `JwtProvider` port interface (abstraction for JWT operations)
  - [x] Created `FastifyJwtProvider` adapter (implements JwtProvider using Fastify plugin)
  - [x] Refactored `JwtTokenService` to depend on JwtProvider abstraction, not Fastify
  - [x] Moved all `as any` casts to FastifyJwtProvider adapter only (isolated, acceptable)
  - [x] Made `verifyAccessToken()` and `verifyRefreshToken()` async for blacklist lookup
  - [x] Removed unnecessary `any` types from controllers: desks.controller.ts, reservations.controller.ts
  - [x] Fixed TypeScript in rateLimitPolicies.ts: Fastify.register() parameter order

## Phase 5: Docs
- [ ] Document new policies and env vars in README or docs.
