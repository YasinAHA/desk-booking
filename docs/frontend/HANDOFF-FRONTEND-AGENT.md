# Handoff Frontend Agent

## Objetivo inmediato
- Implementar bootstrap de frontend productivo alineado con el contrato backend actual.
- Consumir solo contrato v1 bajo `/api/internal/desk-booking/v1`.

## Alcance del primer bloque
- Setup `React + TypeScript + Vite`.
- Router base y layout inicial.
- Integrar TanStack Query.
- Cliente API con flujo `401 -> refresh -> retry`.
- Flujos mínimos:
  - login/logout
  - listado de desks por fecha
  - crear/cancelar reserva
  - check-in de reserva (`POST /reservations/{id}/check-in`)
  - admin users (`GET/PATCH /admin/users`)
  - admin desks + layout (`GET /admin/desks`, `PATCH /admin/desks/{id}/layout`, `PATCH /admin/desks/{id}/status`)
  - admin floorplan (`GET/PATCH /admin/floorplan?officeId=...`)
  - admin QR (`GET /admin/desks/qr`, `POST /admin/desks/qr/regenerate-bulk`)
  - admin reports (JSON + `format=csv`)

## Fuentes de verdad obligatorias
- `docs/frontend/AI-GUIDE-FRONTEND.md`
- `docs/frontend/ARCHITECTURE-FRONTEND.md`
- `docs/frontend/API-CONTRACT.md`
- `docs/frontend/QUALITY-GATES.md`
- `docs/openapi.json`
- `docs/simplificacion/PLAN-IMPLEMENTACION.md`

## Variables de entorno esperadas
- `VITE_API_BASE_URL`
- (opcional) `SENTRY_DSN_FRONTEND`, `SENTRY_ENV`, `APP_VERSION`

## Quality gates (Definition of Done)
- `lint` OK
- `typecheck` OK
- `test` OK
- `build` OK
- e2e smoke de flujo crítico cuando aplique

## Límites de ejecución
- No tocar backend salvo ajustes de contrato aprobados.
- No añadir dependencias fuera de `docs/frontend/FRONTEND-DECISIONS.md` sin registrar decisión.
- No editar manualmente tipos OpenAPI generados.
- No meter lógica de negocio en UI.

## Plan de PRs recomendado
1. Bootstrap técnico (estructura + tooling + quality scripts).
2. Auth + sesión (`refresh` y guardas de ruta).
3. Reservas/desks usuario.
4. Admin core (users, desks/layout, floorplan).
5. Admin QR + reports (incluye export CSV).
6. Hardening UX + e2e.

