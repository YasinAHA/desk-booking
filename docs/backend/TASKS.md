# Backend Tasks (v0.8.0)

Este fichero contiene únicamente las tareas activas de backend para la versión en curso.

Histórico de tareas cerradas: consultar los tags/release notes en Git y `CHANGELOG.md`.

## Contexto de entrega
- Fecha objetivo de entrega: `2026-02-23`.
- Criterio: priorizar funcionalidad visible, estabilidad y despliegue.
- Todo hardening/refactor no bloqueante se mueve a `docs/backend/BACKLOG.md`.

## Prioridad P0 (entrega)
- [x] Implementar backend para **Admin UI básica** (operaciones mínimas de gestión necesarias para demo/uso interno).
- [x] Implementar flujo backend de **QR check-in** end-to-end.
- [x] Normalizar contrato HTTP a `camelCase` (según ADR-0007) en endpoints existentes:
  - auth (responses mapeadas en `interfaces/http/auth`)
  - desks (listado user/admin + regeneración QR)
  - reservations (create/list/cancel/check-in)
- [x] Actualizar OpenAPI tras normalización de naming y regenerar `docs/openapi.json`.
- [x] Coordinar ajuste de frontend al nuevo contrato HTTP (`camelCase`) y validar flujo completo.
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

## Foco inmediato
- [ ] Revisar y validar funcionalmente el flujo de **check-in QR** en entorno real (ventana horaria, estados y mensajes UX).
