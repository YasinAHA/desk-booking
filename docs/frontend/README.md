# Frontend Docs

## Arranque rapido
- `npm install` en la raiz.
- `npm -w frontend run dev` para entorno local.
- `npm -w frontend run build` para build de produccion.

## Quality gates frontend
- `npm -w frontend run lint`
- `npm -w frontend run typecheck`
- `npm -w frontend run test`

## Contrato API tipado
- `npm -w frontend run generate:openapi-types` genera `src/shared/openapi/generated/schema.ts` desde `docs/openapi.json`.

## Variables de entorno frontend
- `VITE_API_BASE_URL` (default local `http://localhost:3001`).
- Opcionales: `SENTRY_DSN_FRONTEND`, `SENTRY_ENV`, `APP_VERSION`.

## Indice
- [AI-GUIDE-FRONTEND.md](AI-GUIDE-FRONTEND.md)
- [ARCHITECTURE-FRONTEND.md](ARCHITECTURE-FRONTEND.md)
- [API-CONTRACT.md](API-CONTRACT.md)
- [QUALITY-GATES.md](QUALITY-GATES.md)
- [FRONTEND-DECISIONS.md](FRONTEND-DECISIONS.md)
- [RUNBOOK-FRONTEND.md](RUNBOOK-FRONTEND.md)
- [TASKS.md](TASKS.md)
- [HANDOFF-FRONTEND-AGENT.md](HANDOFF-FRONTEND-AGENT.md)
- [llm-context/frontend-context.md](llm-context/frontend-context.md)
- [ai/README.md](ai/README.md)
- [design/DESIGN-SYSTEM.md](design/DESIGN-SYSTEM.md)
