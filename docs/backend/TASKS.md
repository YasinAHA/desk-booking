# Backend Tasks (v0.6.0)

Este fichero contiene las tareas activas de backend.

## v0.6.0 (Prioridad) Arquitectura y modularidad

Objetivo: modularizar internamente por feature de forma incremental, sin big-bang y sin regresiones.

### Fuente prioritaria de ejecución
- [ ] Ejecutar y mantener actualizado `docs/backend/ARCHITECTURE-V0.6-PLAN.md` como checklist operativo de v0.6.0.
- [ ] Reflejar en este fichero solo el estado resumido por fases/hitos y decisiones cerradas.

### Plan incremental
- [x] Registrar decisión arquitectónica en `docs/DECISIONS.md` y ADR (modelo híbrido: capas + agrupación por feature).
- [x] Auth: mover composition root a `backend/src/composition/auth.container.ts`.
- [x] Reservations: mover composition root a `backend/src/composition/reservations.container.ts`.
- [x] Desks: mover composition root a `backend/src/composition/desks.container.ts`.
- [~] Fase 1 (auth): reorganizar módulos de `application` e `infrastructure` por feature manteniendo contratos actuales.
- [x] Auth/infrastructure: mover adapters a `backend/src/infrastructure/auth/*` (repositories, security, policies).
- [x] Auth/application (transición): mover `usecase` a `backend/src/application/auth/handlers/auth.usecase.ts`.
- [ ] Auth/application (objetivo): separar `handlers` en `commands` y `queries` manteniendo contratos HTTP.
- [x] Fase 2: renombre `domain/value-objects` y ajuste de imports.
- [ ] Fase 2 (reservations): misma estrategia, sin cambios funcionales.
- [ ] Fase 3 (desks): misma estrategia, sin cambios funcionales.
- [ ] Mantener `interfaces/http` como eje por feature y alinear nomenclatura/rutas de imports.
- [ ] Evitar movimientos transversales en una sola PR; una PR por feature con tests en verde.

### Deuda técnica previa (alta prioridad)
- [x] Corregir flujo de refresh token para no emitir access token con payload parcial/vacío.
- [x] Eliminar `any` en factories transaccionales de `composition/auth.container`.
- [ ] Normalizar imports/extensiones inconsistentes.

### Criterios de aceptacion
- [ ] Sin imports ilegales entre capas (application no depende de infrastructure/interfaces).
- [ ] Sin regresiones funcionales en auth/reservations/desks.
- [ ] Tests backend pasando al 100% tras cada fase.
- [ ] Documentación (AI-GUIDE/ARCHITECTURE/TASKS/CHANGELOG) actualizada al cierre.


