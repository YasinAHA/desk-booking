# Known issues / Deuda tecnica

Tareas v0.5.0: ver [docs/TASKS.md](docs/TASKS.md).
Backlog v0.6.0: ver [docs/BACKLOG.md](docs/BACKLOG.md).

## v0.5.0 Status
- ✅ Schema v1.0.0 implemented (office/floor/zone/desk hierarchy)
- ✅ User names refactored (first_name/last_name/second_last_name)
- ✅ Email outbox pattern with worker implemented
- ✅ 46 tests passing (auth, reservation, desk, repository, routes)
- ✅ Frontend alignment complete

## Pending for v0.7.0+
- Admin UI for desk management and holiday calendars
- QR check-in functionality
- Audit logging (events for reservation and admin actions)
- Basic reporting (occupancy, no-show, blocks)

## Docs
- Swagger/OpenAPI: postponed for v0.8.0 (documentation automation)
- AI-GUIDE.md: see [AI-GUIDE.md](AI-GUIDE.md) for development workflow

## Security (v0.5.0)
- ✅ Tokens with refresh token rotation (accessToken + refreshToken)
- ✅ Email confirmation required before login
- ✅ Password hashed with Argon2
- 🔄 Token refresh via POST /auth/refresh (not yet exposed in frontend)
- Future: cookie httpOnly option for extra XSS protection
