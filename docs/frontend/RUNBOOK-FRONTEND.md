# Frontend Runbook

## Prerrequisitos
- Node LTS.
- npm.
- Backend desk-booking en ejecución.

## Variables de entorno esperadas
- `VITE_API_BASE_URL` (ejemplo: `http://localhost:3001`).
- Opcional observabilidad:
  - `SENTRY_DSN_FRONTEND`
  - `SENTRY_ENV`
  - `APP_VERSION`

## Arranque local
1. Instalar dependencias.
2. Levantar backend.
3. Levantar frontend en modo dev.
4. Verificar login, listado desks y reserva.

## Troubleshooting
- 401 recurrente:
  - revisar flujo refresh y tokens almacenados.
  - validar clock/timezone local.
- Errores de CORS:
  - confirmar `CORS_ORIGINS` backend incluye origen frontend.
- Drift de contrato:
  - regenerar tipos OpenAPI y validar build/typecheck.
- Sentry:
  - no enviar tokens, emails ni datos sensibles.
  - subir sourcemaps solo en entorno de release.

## Checklist antes de merge
- `lint` OK.
- `typecheck` OK.
- `test` OK.
- `build` OK.
- smoke e2e OK.
