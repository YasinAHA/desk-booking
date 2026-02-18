# AI Guide

Guía global para colaboración asistida por IA en el monorepo.

## Objetivo
- Mantener coherencia técnica y de proceso.
- Evitar cambios que rompan arquitectura, trazabilidad o flujo de release.
- Delegar detalles por área en guías específicas.

## Estado actual
- Backend en foco de arquitectura (v0.6.x cerrada a nivel técnico).
- Trabajo nuevo planificado para v0.7.0 en `docs/backend/TASKS.md`.
- Flujo de ramas activo: desarrollo en `next`; `main` para cierres/versionado.

## Guías por área
- Backend: [backend/AI-GUIDE-BACKEND.md](backend/AI-GUIDE-BACKEND.md)
- Frontend: [frontend/AI-GUIDE-FRONTEND.md](frontend/AI-GUIDE-FRONTEND.md)

## Fuentes de verdad globales
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [DECISIONS.md](DECISIONS.md)
- [TASKS.md](TASKS.md)
- [BACKLOG.md](BACKLOG.md)
- [SCOPE.md](SCOPE.md)
- Backend: [backend/TASKS.md](backend/TASKS.md), [backend/BACKLOG.md](backend/BACKLOG.md)

## Reglas operativas
- Cambios de una sola área: seguir su guía específica.
- Cambios transversales: actualizar también `DECISIONS.md` y, si aplica, ADR.
- Commits y tags en inglés, siguiendo convención existente.
- No mezclar refactor estructural y feature nueva en el mismo bloque de trabajo.
- Antes de cerrar bloque: `lint`, `lint:types`, `build`, `test` (si aplica al área).

## Cierre documental de versiones
- Los planes temporales se archivan en `docs/*/archive/` al cierre de la versión.
- La arquitectura vigente se mantiene en documentos estables (`ARCHITECTURE*.md`).
