# Frontend Decisions

Registro breve de decisiones técnicas frontend.

| Fecha | Decisión | Motivo |
| --- | --- | --- |
| 2026-02-21 | React + TypeScript + Vite | Productividad alta y base moderna estable. |
| 2026-02-21 | TanStack Query para estado servidor | Caché, retries e invalidaciones robustas. |
| 2026-02-21 | React Router para navegación | Enrutado estándar para SPA modular. |
| 2026-02-21 | Zod para validación runtime | Defensa en runtime y contratos explícitos. |
| 2026-02-21 | Tailwind + shadcn/ui | Velocidad de implementación con accesibilidad base. |
| 2026-02-21 | Vitest + Testing Library + Playwright | Cobertura equilibrada unit/integration/e2e. |
| 2026-02-21 | openapi-typescript para tipos API | Evitar drift frontend-backend. |
| 2026-02-21 | Backend como única autoridad de autorización | Frontend usa guards para UX, no para seguridad real. |
| 2026-02-21 | Husky en raíz de monorepo | Quality gates unificados backend/frontend. |
| 2026-02-21 | Sentry opcional por entorno | Observabilidad sin bloquear fase inicial. |
