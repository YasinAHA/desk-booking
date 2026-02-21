# Tasks (Global v0.8.0)

Este fichero contiene únicamente tareas transversales activas del monorepo para la versión en curso.

Histórico de tareas cerradas: consultar tags/release notes en Git y `CHANGELOG.md`.

## Prioridad P0 (entrega)
- [ ] Mantener sincronizados los índices de documentación (`docs/README.md`, `docs/backend/README.md`, `docs/frontend/README.md`).
- [ ] Verificar coherencia entre `SCOPE`, `TASKS` y `CHANGELOG` antes del cierre de versión.

## Prioridad P1 (tras cerrar backend funcional de Admin UI + QR)
- [x] Definir un frontend "en condiciones" (arquitectura mínima, flujo de navegación, estado y estándares de UI).
- [x] Convertir esa definición en roadmap por hitos para la siguiente versión.
- [ ] Implementar bootstrap técnico del frontend según docs (`React + TS + Vite`, Query, Router, OpenAPI types).

## Prioridad P1 (cross-cutting)
- [x] Activar quality gates globales en monorepo con Husky (`pre-commit`, `pre-push`).
- [ ] Completar integración Sentry global por fases (backend envío real, frontend envío real, sanitización estricta).

## Referencias por área
- Backend tasks activas: [backend/TASKS.md](backend/TASKS.md)
- Backend backlog: [backend/BACKLOG.md](backend/BACKLOG.md)
