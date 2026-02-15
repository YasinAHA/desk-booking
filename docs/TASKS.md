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

## v0.5.1 ✅ COMPLETED (Naming Convention Refactor)

Objetivo: Estandarizar convención de nombres a `kebab-case` para archivos.

Ver [AI-GUIDE.md § Naming Conventions](/docs/AI-GUIDE.md#convenciones-de-nombres-naming-conventions)

### Resultado
- [x] Archivos renombrados a kebab-case (ports, repositories, policies, security, notifiers, http, workers)
- [x] Imports actualizados y sin referencias rotas
- [x] Eliminados duplicados camelCase
- [x] Tests backend 55/55 pasando

### Pendiente (post v0.5.1)
- [ ] Definir aliases de paths en tsconfig (p.ej. @domain, @application, @infrastructure, @interfaces, @config)
- [ ] Migrar imports a aliases (si se aprueba la convencion)

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
