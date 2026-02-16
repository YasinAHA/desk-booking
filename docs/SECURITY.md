# Security

## Overview

Este documento define la estrategia de seguridad para la aplicacion desk-booking.
Sigue dos principios clave: **Security by Design** (arquitectura segura desde el inicio)
y **Security by Default** (configuraciones seguras por defecto).

## Principles

### Security by Design

La seguridad esta integrada en la arquitectura, no agregada despues.

| Principio | Implementacion | Ubicacion |
|-----------|---|---|
| **Layers & Separation** | domain -> application -> infrastructure -> interfaces. Cada capa tiene responsabilidades claras. | `backend/src/` |
| **Typed Domain Errors** | Errores de negocio como tipos, no strings. Mapeados en HTTP. | `domain/entities/` |
| **Value Objects** | Validacion en la frontera del dominio (Email, PasswordHash, UserId, etc.) | `domain/valueObjects/` |
| **Transactions** | Multi-step auth ops (create user + send email) en transaccion DB. | `authUseCase.register()` |
| **Immutable Entities** | Domain entities no tienen setters. Metodos retornan nuevas instancias. | `domain/entities/user.ts` |
| **Ports & Adapters** | Use cases dependen de puertos, no de impl. Facil testear y reemplazar. | `application/ports/` |

### Security by Default

Las configuraciones por defecto son seguras, no inseguras.

| Aspecto | Default (Dev) | Production | Enforced? |
|--------|---|---|---|
| **JWT_REFRESH_SECRET** | Safe dev value | **REQUIRED** (enforced, min 32 chars) | Yes, Zod validation |
| **DATABASE_URL** | localhost (no SSL) | SSL recomendado/obligatorio segun entorno | Manual |
| **NODE_ENV** | development (verbose) | production (minimal) | Manual |
| **EMAIL_MODE** | fake (no sends) | real (SMTP) | Yes, env-based |
| **CORS_ORIGINS** | Specific localhost | Env-required | Yes, validation |
| **HTTP Headers** | Helmet CSP+HSTS | Helmet CSP+HSTS | Yes, helmet plugin |
| **Rate Limiting** | Global + endpoint-specific | Global + endpoint-specific | Yes |
| **Password Policy** | 12+ chars, mixed case, digit, special | Same | Yes, Zod refine |

---

## Security Features (v0.5.0)

### Authentication

**JWT with Refresh Token Pattern**
- Access token: 15m expiration (short-lived)
- Refresh token: 7d expiration (stored in localStorage, v0.6.0: cookie httpOnly)
- Token ID (jti): unique per token for revocation
- Token type claim: distinguishes access vs refresh

```typescript
// Access token payload
{ id, email, firstName, lastName, secondLastName, jti, type: "access" }

// Refresh token payload
{ id, jti, type: "refresh" }
```

**Email Confirmation Required**
- Users must confirm email before login
- 24h TTL for verification tokens
- Can re-request verification

**Password Security**
- Hashed with Argon2 (industry standard for passwords)
- Enforced complexity: 12+ chars, uppercase, lowercase, digit, special char
- No common patterns allowed (123, abc, qwerty, etc.)

### Authorization

**Role-based (v0.5.0)**
- `user`: can reserve desks for themselves
- `admin`: can manage desks, view all reservations (not yet implemented, v0.7.0)

### Database

**Constraints & Policies**
- Unique email (CITEXT, case-insensitive)
- One active reservation per user per day and one active reservation per desk per day
- ON DELETE strategy: RESTRICT for reservations, CASCADE for dependent tables, SET NULL for audit references
- Soft deletes for audit trails (deleted_at IS NOT NULL)

**Transactions**
- Auth register wraps user creation + email verification in transaction
- Atomicity: all-or-nothing

### Transport

**HTTP Security Headers** (via Helmet)
- `Strict-Transport-Security`: HSTS (1 year, preload)
- `X-Frame-Options`: DENY (no clickjacking)
- `X-Content-Type-Options`: nosniff (MIME-sniffing prevention)
- `Content-Security-Policy`: restrictive (self src only, limited inline)
- `Referrer-Policy`: strict-origin-when-cross-origin

**CORS**
- Whitelist-based origin validation (env-configured)
- Credentials: true (allows cookies & auth headers)

**Rate Limiting**
- Global: 100 req/15min per IP
- Auth endpoints:
  - Login: 10/min
  - Register: 5/10min
  - Verify: 20/min

### Input Validation

**Zod Schemas**
- All HTTP payloads validated at interfaces layer
- Type-safe at compile time
- Password policy validated via `.refine()`

### Output

**Error Responses**
- Generic messages to client (no PII or stack trace leaks)
- Example: "Credenciales invalidas." instead of "User not found" or "Email taken"
- Request ID for audit tracking

---

## Security Decisions (v0.5.0)

| Decision | Rationale | Trade-off |
|----------|-----------|-----------|
| Email confirmation required | Prevents fake/spam registration | User friction (confirmation step) |
| Argon2 password hashing | Resistant to GPU attacks, slow-by-design | CPU-intensive on registration |
| 12-char password minimum | Brute-force resistant | UX: harder for users to remember |
| Helmet CSP `unsafe-inline` for styles | Pragmatic for vanilla CSS | Slightly weaker CSP |
| No refresh token in cookie yet | Vanilla JS frontend (v0.5.0) | XSS vulnerability (localStorage) |
| Soft deletes | Audit trail preservation | Queries must filter `deleted_at IS NULL` |
| Tokens in localStorage | Required for vanilla JS frontend | XSS attack surface in v0.5.0 |

---

## Known Gaps & Future Work (v0.6.0+)

### v0.6.0 (Hardening)
- [ ] Refresh token in cookie httpOnly (removes XSS + CSRF surface)
- [ ] CSRF tokens for state-changing operations (POST/DELETE)
- [ ] PII logging filter (no emails in logs)
- [ ] Token revocation verification in refresh endpoint
- [ ] Admin UI with role enforcement

### v0.7.0+
- [ ] 2FA (TOTP/SMS)
- [ ] Audit logging (user actions, admin actions)
- [ ] Rate limiting per user (instead of per IP)
- [ ] IP whitelisting for admin endpoints
- [ ] WAF rules integration (if cloud-deployed)

### Future (SaaS)
- [ ] Multi-org isolation (database row-level security)
- [ ] API keys for integrations
- [ ] OAuth2 / SAML (if needed)
- [ ] Encrypted at-rest for sensitive data

---

## Testing

All security features are covered by unit + integration tests:
```bash
npm -w backend run test
# 55 tests passing (auth, reservation, desk, repository, routes)
```

Test coverage includes:
- [x] Email confirmation enforcement
- [x] Password policy validation
- [x] Rate limiting
- [x] Unique constraints
- [x] Transaction rollbacks on errors

---

## Deployment Checklist

Before deploying to production:

- [ ] Set `NODE_ENV=production`
- [ ] Set `JWT_SECRET` to a strong random value (not in code)
- [ ] Set `JWT_REFRESH_SECRET` to a strong random value (not in code)
- [ ] Set `DATABASE_URL` to production Postgres (with SSL)
- [ ] Set `DB_SSL=true`
- [ ] Set `EMAIL_MODE=real` with production SMTP credentials
- [ ] Set `CORS_ORIGINS` to production domain(s)
- [ ] Review `ALLOWED_EMAIL_DOMAINS`
- [ ] Enable HTTPS/TLS at reverse proxy level
- [ ] Enable database backups
- [ ] Setup monitoring & log aggregation
- [ ] Run smoke tests after deploy

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [Argon2 Password Hashing](https://github.com/ranisalt/node-argon2)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
