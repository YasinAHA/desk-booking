# Backend Tasks (v0.6.0)

Este fichero contiene las tareas activas de backend.

## v0.6.0 (Prioridad) Arquitectura y modularidad

Objetivo: modularizar internamente por feature de forma incremental, sin big-bang y sin regresiones.

### Plan incremental
- [x] Registrar decisión arquitectónica en `docs/DECISIONS.md` y ADR (modelo híbrido: capas + agrupación por feature).
- [ ] Fase 1 (auth): reorganizar módulos de `application` e `infrastructure` por feature manteniendo contratos actuales.
- [ ] Fase 2 (reservations): misma estrategia, sin cambios funcionales.
- [ ] Fase 3 (desks): misma estrategia, sin cambios funcionales.
- [ ] Mantener `interfaces/http` como eje por feature y alinear nomenclatura/rutas de imports.
- [ ] Evitar movimientos transversales en una sola PR; una PR por feature con tests en verde.

### Deuda técnica previa (alta prioridad)
- [ ] Corregir flujo de refresh token para no emitir access token con payload parcial/vacio.
- [ ] Eliminar `any` en factories transaccionales de `auth.container`.
- [ ] Normalizar imports/extensiones inconsistentes.

### Criterios de aceptacion
- [ ] Sin imports ilegales entre capas (application no depende de infrastructure/interfaces).
- [ ] Sin regresiones funcionales en auth/reservations/desks.
- [ ] Tests backend pasando al 100% tras cada fase.
- [ ] Documentación (AI-GUIDE/ARCHITECTURE/TASKS/CHANGELOG) actualizada al cierre.


