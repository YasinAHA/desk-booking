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

Objetivo: Estandarizar convención de nombres a `kebab-case` para archivos y migrar imports a path aliases en backend/src.


Ver [AI-GUIDE.md § Naming Conventions](/docs/AI-GUIDE.md#convenciones-de-nombres-naming-conventions)
Ver [AI-GUIDE.md § Path Aliases](/docs/AI-GUIDE.md#path-aliases)

### Resultado
- [x] Archivos renombrados a kebab-case (ports, repositories, policies, security, notifiers, http, workers)
- [x] Imports actualizados y sin referencias rotas
- [x] Eliminados duplicados camelCase
- [x] Definidos path aliases en tsconfig.json (@domain, @application, @infrastructure, @interfaces, @config)
- [x] Migrados todos los imports de backend/src a aliases
- [x] Tests backend 55/55 pasando con aliases

### Pendiente (post v0.5.1)

_(Sin pendientes: todas las tareas de aliases completadas en v0.5.1)_

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

---

## Cierre de version v0.5.1 (release checklist)

Objetivo: cerrar formalmente la v0.5.1 antes de iniciar cambios de v0.6.0.

### 1) Validacion tecnica
- [x] `npm -w backend run test` en verde.
- [x] `npm -w backend run build` en verde.
- [x] Sin errores de tipado/imports tras el refactor de naming.

### 2) Documentacion y trazabilidad
- [x] Actualizar `CHANGELOG.md` con entrada `[0.5.1]` (fecha, Added/Changed/Fixed).
- [x] Verificar coherencia entre `README.md`, `docs/TASKS.md`, `docs/BACKLOG.md` y `docs/DECISIONS.md`.
- [x] Confirmar que los endpoints y scripts documentados coinciden con el codigo actual.

### 3) Estado de git
- [ ] Worktree limpio o cambios no relacionados identificados y fuera del scope de release.
- [ ] Commit de cierre de documentacion/release realizado en `next`.
- [x] Revisar `git log --oneline --decorate -n 20` para validar historial de cierre.

### 4) Tag y versionado
- [ ] Crear tag anotado `v0.5.1` sobre el commit de cierre.
- [ ] Push de branch `next` y del tag `v0.5.1`.
- [ ] Verificar que `git tag --sort=-creatordate` muestra `v0.5.1` como ultimo tag.

### 5) Verificacion post-cierre
- [ ] Smoke check local (`/health`, `/auth/login`, `/desks`, `/reservations/me`).
- [ ] Confirmar backlog v0.6.0 listo para ejecucion.
- [ ] Congelar cambios estructurales hasta abrir primera tarea de v0.6.0.
