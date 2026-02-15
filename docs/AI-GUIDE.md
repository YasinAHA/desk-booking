# AI Guide

Documento de referencia para mantener consistencia arquitectónica y decisiones de diseño.
Acta como constitución técnica del repositorio desk-booking.

## Objetivo
- Mantener coherencia con el TFM y la arquitectura Clean + SOLID.
- Evitar desviaciones tecnológicas o decisiones no documentadas.
- Priorizar reducción de deuda técnica.
- Garantizar decisiones arquitectónicas consistentes y trazables.

## Fuentes de verdad
- [docs/ARCHITECTURE.md](/docs/ARCHITECTURE.md)
- [docs/SCOPE.md](/docs/SCOPE.md)
- [docs/TOOLING.md](/docs/TOOLING.md)
- [docs/DEPLOYMENT.md](/docs/DEPLOYMENT.md)
- [docs/DECISIONS.md](/docs/DECISIONS.md)
- [docs/TASKS.md](/docs/TASKS.md)
- [docs/BACKLOG.md](/docs/BACKLOG.md)
- [docs/TASK-REFACTOR.md](/docs/TASK-REFACTOR.md) (track de refactorings)
- [CHANGELOG.md](../CHANGELOG.md)

## Principios innegociables

### Arquitectura por capas (Clean Architecture)
Las dependencias SIEMPRE apuntan hacia adentro:
```
Interfaces (HTTP) → Application → Domain
Infrastructure ← Application ← Domain
```

**Regla de oro:** Domain nunca conoce frameworks ni infraestructura.

- **Domain** (`domain/`): Entidades, Value Objects, reglas de negocio puras.
- **Application** (`application/`): Use cases, orquestación, ports (contratos).
- **Infrastructure** (`infrastructure/`): Implementaciones de ports (DB, mailer, etc).
- **Interfaces** (`interfaces/`): Controllers, DTOs, validación, adaptadores HTTP.

### SOLID principles
- **S (Single Responsibility):** Cada clase/función una razón para cambiar.
  - Controllers mapean HTTP → use cases.
  - Use cases orquestan lógica de negocio.
  - Repositories acceden a datos.
- **O (Open/Closed):** Abierto a extensión, cerrado a modificación.
  - Use ports para extensión sin tocar application.
- **L (Liskov Substitution):** Implementaciones intercambiables de ports.
- **I (Interface Segregation):** Ports especializados por responsabilidad.
  - `UserRepository`, `EmailVerificationRepository` (no un "super-repository").
  - `ReservationCommandRepository`, `ReservationQueryRepository` (CQRS).
- **D (Dependency Inversion):** Depender de abstracciones, no implementaciones.
  - JwtTokenService depende de JwtProvider (port), no FastifyInstance.
  - Controllers inyectan dependencias, no crean directamente.

### Patrones arquitectónicos

#### Ports & Adapters
- **Puerto:** Interfaz en `application/ports/` (e.g., `TokenRevocationRepository`).
- **Adaptador:** Implementación en `infrastructure/repositories/` o `interfaces/http/auth/adapters/`.
- Ejemplo: `JwtProvider` (port) → `FastifyJwtProvider` (adapter que encapsula Fastify).

#### CQRS (Command Query Responsibility Segregation)
- **Command:** Modifica estado → `ReservationCommandRepository`.
- **Query:** Lee estado sin efectos → `ReservationQueryRepository`.
- Beneficio: Separación clara, facilita caché y escalado futuro.
- Criterio: usar CQRS estricto solo si hay lecturas complejas o proyecciones; si no, repositorios unificados por entidad.

#### Value Objects
Encapsulan validaciones y reglas de negocio:
- `Email`: valida dominio permitido.
- `ReservationDate`: no permite fechas pasadas.
- `UserId`, `DeskId`, `ReservationId`: tipos seguros en lugar de `string`.

#### Transacciones con Outbox Pattern
Si varios cambios deben ser atómicos (e.g., crear usuario + enviar email):
1. Guardar cambios + evento en `outbox` tabla (una transacción DB).
2. Worker lee `outbox` y ejecuta side effects (emailing).
3. Si worker falla, reintentar sin datos duplicados.

### Use cases (application/usecases/)
- No dependen de otros use cases.
- Puros: sin side effects (efectos mediante ports inyectados).
- Testables sin infraestructura.
- Orquestan domain entities + puertos de infraestructura.

### Serialización y DTOs
- Use cases retornan Domain entities o tipos simples.
- Controllers convierten a DTOs para HTTP.
- NO serializar (JSON.stringify) dentro de use cases.
- NO incluir lógica HTTP en application.

## Seguridad

### Autenticación JWT
- **Access Token:** Expira en 15 minutos (JWT_EXPIRATION).
- **Refresh Token:** Expira en 7 días (JWT_REFRESH_EXPIRATION).
- **Token Rotation:** Login devuelve ambos; `/refresh` endpoint para renovar access token.

### Token Revocation
- **JTI (JSON Web Token ID):** UUID único por token, incluido en payload.
- **Blacklist:** Tabla `token_revocation` almacena JTI revocados.
- **Verificación:** Al verificar token, se consulta blacklist (async).
- **Logout:** Revoca el JTI en la base de datos.

### Mejores prácticas
- **JWT_SECRET, JWT_REFRESH_SECRET:** Cambiar en producción, usar .env.
- **JWT_ISSUER, JWT_AUDIENCE:** Claims que identifican aplicación y consumidores.
- **Hashing:** Usar Argon2 para contraseñas (implementado en `PasswordHasher`).
- **NO enumeración de cuentas:** Respuestas genéricas en login/registro.
- **NO exponer detalles internos** en respuestas HTTP.

### Prevención de enumeración de cuentas
- Login: validar contraseña antes de confirmar estado (si aplica), o responder siempre con error genérico.
- Registro: responder OK genérico aunque el email exista.
- Endpoint de reenvío de confirmación con respuesta genérica.
- Rate limit en login/registro y telemetría de intentos fallidos.

## Reglas de diseño

### Código
- Tipado fuerte: TypeScript `strict: true` en `tsconfig.json`.
- NO usar `any` excepto en adaptadores de framework (tipo `FastifyJwtProvider`).
- Validación de entrada con Zod en controllers.
- Constants compartidas en `backend/src/config/constants.ts`.
- NO magic numbers: usar enums o constantes nombradas.

### Flujos de datos
- Entrada: HTTP request → Zod schema → controller → use case.
- Procesamiento: Use case con domain logic + ports.
- Salida: Use case retorna domain/app types → controller mapea a DTO → HTTP response.
- Errores: Domain types (no `Error("CODE")`) → traducción en error translator → HTTP responses.

### Dependencias
- Infrastructure depende de Application ports.
- Application depende de Domain.
- NO depender hacia afuera (e.g., no importar Infrastructure en Application).

### Notificaciones y side effects
- Siempre vía ports inyectados (e.g., `Notifier`, `Mailer`).
- Use cases no crean directamente clientes de email/HTTP.
- Implementaciones en `infrastructure/notifiers/` o `infrastructure/email/`.

## Flujo de trabajo recomendado

1. **Revisar fuentes de verdad** en docs/ antes de proponer cambios.
2. **Definir contratos primero:** Si es endpoint → schema + response. Si es arquitectónico → port interface.
3. **Implementar en orden:** Domain entities → Application use cases → Infrastructure adapters → HTTP controllers.
4. **Actualizar migraciones:** Si toca DB, actualizar `docker/postgres/init/001_init.sql` y crear `db/migrations/XXX_*.sql`.
5. **Actualizar docs:** TASK-REFACTOR.md (progreso), DECISIONS.md (si es decisión), CHANGELOG.md.
6. **Testing:** Escribir tests desde Domain → Application → Integration.
7. **Mantener separación:** Features bajo `interfaces/http/<feature>/` con su `.container.ts` (composition root).

## Estilo de código

### Convenciones de nombres (Naming conventions)

**Objetivo:** Coherencia visual y profesionalismo. Facilita onboarding y reduce ambigüedad.

#### Files & Directories
- **Archivos:** `kebab-case` (e.g., `password-policy.ts`, `auth-policy.ts`, `email-confirmation-service.ts`)
- **Directorios:** `camelCase` o descriptivos (e.g., `valueObjects/`, `usecases/`, `repositories/`)
- **Razón:** Estándar de la industria (Google, Angular, NestJS). Busca rápida con autocompletado.

#### Classes & Interfaces
- **Clases:** `PascalCase` (e.g., `class PgReservationCommandRepository {}`)
- **Interfaces:** `PascalCase` (e.g., `interface ReservationCommandRepository {}`)
- **Razón:** JavaScript/TypeScript estándar.

#### Variables & Functions
- **Variables:** `camelCase` (e.g., `const userEmail = "..."`)
- **Funciones:** `camelCase` (e.g., `function validatePasswordPolicy() {}`)
- **Constantes:** `UPPER_SNAKE_CASE` en `config/constants.ts` (e.g., `const MAX_PASSWORD_LENGTH = 128`)
- **Razón:** JavaScript estándar.

#### HTML & CSS
- **HTML IDs:** `kebab-case` (e.g., `id="password-requirements"`, `id="register-email"`)
- **CSS classes:** `kebab-case` (e.g., `.password-requirements`, `.form-field`)
- **Razón:** CSS estándar, consistencia visual con archivos.

#### Database
- **Tablas:** `snake_case` (e.g., `users`, `email_verifications`, `reservation_policies`)
- **Columnas:** `snake_case` (e.g., `password_hash`, `created_at`, `first_name`)
- **Razón:** SQL/PostgreSQL estándar.

#### Evitar
- ❌ Mezclar `camelCase` y `snake_case` en el mismo proyecto
- ❌ `reservation_command_repository.ts` (archivo snake_case)
- ❌ `reservationCommandRepository.ts` (archivo camelCase)
- ❌ `id="registerPassword"` (HTML ID camelCase, debe ser kebab-case)

### TypeScript
- `strict: true`, no usar `any` excepto en adaptadores.
- Preferir tipos explícitos, inference donde sea claro.
- Interfaces para contracts, types para DTOs/simple.

### Funciones y servicios
- **Pure functions:** Domain logic sin side effects.
- **Dependency injection:** Constructor inyecta puertos, no props.
- **Error handling:** Typed errors en domain, mapeo en interfaces.

### Estructura de archivos
```
backend/src/
├── domain/                     # Entidades, Value Objects (puras)
│   ├── entities/
│   └── valueObjects/
├── application/                # Use cases, DTOs, ports
│   ├── usecases/
│   ├── ports/
│   └── services/
├── infrastructure/             # DB, Email, Adapters
│   ├── repositories/           # Implementan ports de application
│   ├── email/
│   └── notifiers/
├── interfaces/                 # HTTP Controllers, DTOs, validação
│   └── http/
│       ├── auth/
│       │   ├── auth.controller.ts
│       │   ├── auth.routes.ts
│       │   ├── auth.container.ts    # Dependency injection
│       │   ├── ports/               # Ports HTTP-específica (e.g., JwtProvider)
│       │   └── adapters/            # Adapters Fastify-específicos
│       ├── desks/
│       └── reservations/
└── config/                     # Constantes, ENV
```

### Validación
- Controllers usan Zod para input validation.
- Use cases asumen input válido (validación es responsabilidad HTTP).
- Domain methods pueden re-validar crítico (e.g., User.confirmEmail).

## Testing

### Estrategia
- **Domain + Use Cases:** Unit tests sin infraestructura (mocks de ports).
- **Infrastructure:** Integration tests con DB real (transaccionales, rollback).
- **Interfaces:** HTTP/integration tests con servidor.
- **Coverage:** Reglas de negocio críticas + casos de error.

### Ejemplo
```typescript
// domain/user.test.ts - Unit
it("User.confirmEmail() debe cambiar isConfirmed", () => {
  const user = new User(...);
  user.confirmEmail();
  expect(user.isConfirmed()).toBe(true);
});

// application/auth.usecase.test.ts - Unit con mocks
it("registerUser debe guardar en repository", () => {
  const mockRepo = { save: jest.fn() };
  const usecase = new AuthUseCase(mockRepo, ...);
  usecase.registerUser(...);
  expect(mockRepo.save).toHaveBeenCalled();
});

// infrastructure/pgUserRepository.test.ts - Integration
it("PgUserRepository.save() persiste en DB", async () => {
  const db = setupTestDb();
  const repo = new PgUserRepository(db);
  await repo.save(user);
  const saved = await db.query("SELECT * FROM users WHERE id=...");
  expect(saved).toBeDefined();
});
```

## Entornos

### Local Development
- Backend: `npm -w backend run dev` (watch mode).
- DB: Postgres via `docker-compose up` en raíz.
- Variables: `backend/.env` basado en `backend/.env.example`.
- Migrations: Se aplican automáticamente al iniciar (ver script en package.json).

### Environment Variables
**Obligatorias:**
- `DATABASE_URL`: Conexión Postgres.
- `JWT_SECRET`: Signing key para access tokens.
- `JWT_REFRESH_SECRET`: Signing key para refresh tokens.
- `ALLOWED_EMAIL_DOMAINS`: Dominios permitidos en registro.

**Configurables (con defaults):**
- `JWT_EXPIRATION`: "15m" (access token lifetime).
- `JWT_REFRESH_EXPIRATION`: "7d" (refresh token lifetime).
- `JWT_ISSUER`: "desk-booking" (iss claim).
- `JWT_AUDIENCE`: "desk-booking-api" (aud claim).
- `OUTBOX_POLL_INTERVAL_MS`: "3000" (worker polling).
- `OUTBOX_BATCH_SIZE`: "20" (emails por batch).

### Producción
- Secretos via env vars (no hardcoded).
- HTTPS obligatorio.
- CORS configurado por dominio.
- Logs estructurados (con request ID cuando sea posible).

## Checklist de revisión (para PRs y cambios con IA)

- [ ] ¿Se respetan las capas? (Domain no conoce infra/framework).
- [ ] ¿Hay imports ilegales entre capas?
- [ ] ¿Errores son tipos/Value Objects, no `Error("CODE")`?
- [ ] ¿Use cases son puros (sin side effects directos)?
- [ ] ¿Se usan ports correctamente (inyectados, no instantiados)?
- [ ] ¿Controllers son delgados (validación → use case → DTO)?
- [ ] ¿ValueObjects validan en constructor?
- [ ] ¿Se tocar DB? → ¿Se actualizó migración y docs?
- [ ] ¿Cambio arquitectónico?  → ¿Se documentó en DECISIONS.md?
- [ ] ¿Tests cubren invariantes críticos?
- [ ] ¿Se respetan SOLID principles?
- [ ] ¿Se mantiene seguridad? (no enumeración de cuentas, secretos en env, etc).
- [ ] ¿Se actualizó CHANGELOG.md?
