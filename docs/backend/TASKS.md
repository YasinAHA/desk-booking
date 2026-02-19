# Backend Tasks (v0.8.0)

Este fichero contiene únicamente las tareas activas de backend para la versión en curso.

Histórico de tareas cerradas: consultar los tags/release notes en Git y `CHANGELOG.md`.

## Contexto de entrega
- Fecha objetivo de entrega: `2026-02-23`.
- Criterio: priorizar funcionalidad visible, estabilidad y despliegue.
- Todo hardening/refactor no bloqueante se mueve a `docs/backend/BACKLOG.md`.

## Prioridad P0 (entrega)
- [ ] Implementar backend para **Admin UI básica** (operaciones mínimas de gestión necesarias para demo/uso interno).
- [ ] Implementar flujo backend de **QR check-in** end-to-end.
- [ ] Validar migraciones y seeds en entorno de despliegue.
- [ ] Ejecutar smoke funcional completo en entorno desplegado:
  - auth (login/refresh/logout, forgot/reset/change password)
  - reservas (alta/cancelación/listado)
  - desks/check-in (incluyendo QR)
- [ ] Cerrar checklist de release técnica:
  - `npm -w backend run lint`
  - `npm -w backend run lint:types`
  - `npm -w backend run build`
  - `npm -w backend run test`

## Prioridad P1 (si hay margen antes de entrega)
- [ ] Mejorar UX de errores funcionales críticos detectados en demo.
- [ ] Ajustar documentación operativa mínima de despliegue y verificación.
