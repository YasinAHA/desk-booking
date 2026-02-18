# ADR-0005: Docs Structure for Monorepo

- Status: Accepted
- Date: 2026-02-17
- Scope: core

## Context
La documentación estaba concentrada en `docs/` raíz con contenido mayoritariamente backend, generando ambigüedad de alcance.

## Decision
- Mantener documentos globales en `docs/`.
- Ubicar documentación especifica por area en:
  - `docs/backend/`
  - `docs/frontend/`
- Mantener ADRs en `docs/adr/`.
- Separar planificación:
  - Global: `docs/TASKS.md`, `docs/BACKLOG.md`
  - Backend: `docs/backend/TASKS.md`, `docs/backend/BACKLOG.md`
- Mover documentos históricos de backend a `docs/backend/archive/`.

## Consequences
- Mejor navegacion y claridad por alcance.
- Menor acoplamiento entre roadmap global y trabajo backend.
- Base preparada para crecimiento real de frontend.

