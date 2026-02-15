# Tasks

## v0.5.0 ✅ COMPLETED

Objetivo: reducir deuda tecnica y reorganizar la arquitectura con SOLID, Clean Architecture, DRY, KISS y patrones de diseno.

### 1) Capas y contratos
- [x] Definir capas (domain, application, infrastructure, interfaces).
- [x] Crear interfaces de repositorios (Users, Desks, Reservations).
- [x] Crear interfaz de notificaciones (Notifier).

### 2) Repositorios
- [x] Implementar repositorios Postgres (PgUserRepository, PgDeskRepository, PgReservationRepository).
- [x] Eliminar acceso directo a `app.db` desde servicios.
- [x] Tests unitarios de repositorios con mocks.

### 3) Use cases
- [x] AuthUseCase desacoplado de Fastify.
- [x] ReservationUseCase con reglas de negocio en dominio.
- [x] EmailConfirmationUseCase en capa de aplicacion.

### 4) Infraestructura
- [x] Mailer como adaptador de infraestructura.
- [x] Config centralizada con esquema.
- [x] Logger con contexto (request id) y adaptadores.

### 5) API / Interfaces
- [x] Rutas delgadas (HTTP -> DTO -> use case).
- [x] Contenedores por feature para wiring de dependencias.
- [x] Manejo de errores estandarizado en un middleware.

### 6) Observabilidad
- [x] Logging estructurado por request.
- [x] Metricas basicas (opcional).

### 7) Testing
- [x] Tests unitarios de use cases.
- [x] Tests de integracion minimos (repos + API).

### 8) Security Hardening (v0.5.0)
- [x] Helmet with CSP + HSTS headers
- [x] Password policy (12+ chars, complexity rules)
- [x] Password policy Value Object with unit tests
- [x] Frontend password validation with checklist
- [x] Comprehensive SECURITY.md documentation
- [x] JWT_REFRESH_SECRET production enforcement

---

## v0.5.1 (Naming Convention Refactor)

Objetivo: Estandarizar convención de nombres a `kebab-case` para archivos (excepto en domain/application/infrastructure bases donde camelCase está documentado).

Ver [AI-GUIDE.md § Naming Conventions](docs/AI-GUIDE.md#convenciones-de-nombres-naming-conventions)

### Files to rename (26 total)

#### application/ports/ (12 files)
- [ ] authPolicy.ts → auth-policy.ts (+ update 4 imports)
- [ ] deskRepository.ts → desk-repository.ts (+ update 2 imports)
- [ ] emailConfirmationService.ts → email-confirmation-service.ts (+ update 1 import)
- [ ] emailOutbox.ts → email-outbox.ts (+ update 1 import)
- [ ] emailVerificationRepository.ts → email-verification-repository.ts (+ update 2 imports)
- [ ] passwordHasher.ts → password-hasher.ts (+ update 1 import)
- [ ] reservationCommandRepository.ts → reservation-command-repository.ts (+ update 2 imports)
- [ ] reservationQueryRepository.ts → reservation-query-repository.ts (+ update 2 imports)
- [ ] tokenRevocationRepository.ts → token-revocation-repository.ts (+ update 1 import)
- [ ] tokenService.ts → token-service.ts (+ update 2 imports)
- [ ] transactionManager.ts → transaction-manager.ts (+ update 1 import)
- [ ] userRepository.ts → user-repository.ts (+ update 2 imports)

#### application/usecases/ (1 file)
- [ ] emailConfirmation.usecase.ts → email-confirmation.usecase.ts (+ update 1 import)

#### infrastructure/db/ (1 file)
- [ ] pgTransactionManager.ts → pg-transaction-manager.ts (+ update 1 import)

#### infrastructure/repositories/ (12 files)
- [ ] pgDeskRepository.ts → pg-desk-repository.ts (+ update 1 import)
- [ ] pgDeskRepository.test.ts → pg-desk-repository.test.ts
- [ ] pgEmailOutbox.ts → pg-email-outbox.ts (+ update 1 import)
- [ ] pgEmailVerificationRepository.ts → pg-email-verification-repository.ts (+ update 1 import)
- [ ] pgEmailVerificationRepository.test.ts → pg-email-verification-repository.test.ts
- [ ] pgReservationCommandRepository.ts → pg-reservation-command-repository.ts (+ update 1 import)
- [ ] pgReservationCommandRepository.test.ts → pg-reservation-command-repository.test.ts
- [ ] pgReservationQueryRepository.ts → pg-reservation-query-repository.ts (+ update 1 import)
- [ ] pgReservationQueryRepository.test.ts → pg-reservation-query-repository.test.ts
- [ ] pgTokenRevocationRepository.ts → pg-token-revocation-repository.ts (+ update 1 import)
- [ ] pgUserRepository.ts → pg-user-repository.ts (+ update 1 import)
- [ ] pgUserRepository.test.ts → pg-user-repository.test.ts

#### infrastructure/policies/ (1 file)
- [ ] domainAuthPolicy.ts → domain-auth-policy.ts (+ update 2 imports)

#### infrastructure/security/ (2 files)
- [ ] argon2PasswordHasher.ts → argon2-password-hasher.ts (+ update 1 import)
- [ ] sha256TokenService.ts → sha256-token-service.ts (+ update 1 import)

#### infrastructure/notifiers/ (1 file)
- [ ] emailNotifier.ts → email-notifier.ts (+ update 1 import)

#### interfaces/http/auth/ (2 files)
- [ ] ports/jwtProvider.ts → ports/jwt-provider.ts (+ update 1 import)
- [ ] adapters/fastifyJwtProvider.ts → adapters/fastify-jwt-provider.ts (+ update 1 import)

#### interfaces/http/schemas/ (1 file)
- [ ] dateSchemas.ts → date-schemas.ts (+ update 4 imports)

#### interfaces/http/policies/ (1 file)
- [ ] rateLimitPolicies.ts → rate-limit-policies.ts (+ update 1 import)

### Estimated Impact
- **Total files affected:** 26 renames + ~35 import updates
- **Estimated time:** 1-2 hours (with manual verification)
- **Risk level:** LOW (no logic changes, only file renames + imports)
- **Test coverage:** 55/55 tests must pass after refactor
- **Breaking changes:** NONE (internal refactor only)

### Refactoring Strategy
1. Create new files with kebab-case names (copy-paste content)
2. Update all import statements (bulk find-replace by module)
3. Delete old files
4. Run `npm -w backend run test` to verify 55/55 pass
5. Commit with message: `chore: standardize file naming to kebab-case (backend/)`
6. Tag `v0.5.1`

### Success Criteria
- [ ] All 26 files renamed successfully
- [ ] All imports updated (no broken references)
- [ ] 55/55 tests passing
- [ ] No console errors on build
- [ ] `npm -w backend run build` succeeds

---

## v0.6.0+ (Future Work)

### Security (v0.6.0)
- [ ] Refresh token in httpOnly cookie (vs localStorage)
- [ ] CSRF token protection on state-changing endpoints
- [ ] Token revocation verification in refresh endpoint
- [ ] Audit logging for user/admin actions
- [ ] PII filtering in logs

### Features (v0.7.0+)
- [ ] Admin UI with role enforcement
- [ ] QR check-in for desk occupancy
- [ ] 2FA (TOTP) support
- [ ] Email digest with reservation summaries
