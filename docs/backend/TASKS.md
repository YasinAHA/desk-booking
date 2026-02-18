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
- [x] Auth/application (objetivo): separar `handlers` en `commands` y `queries` manteniendo contratos HTTP.
- [x] Fase 2: renombre `domain/value-objects` y ajuste de imports.
- [x] Fase 4 (reservations): misma estrategia, sin cambios funcionales.
- [x] Fase 5 (desks): misma estrategia, sin cambios funcionales.
- [x] SQL bootstrap mínimo en Docker y migraciones como fuente única de esquema.
- [x] Cerrar estructura final: `domain` por feature (`auth`, `reservations`, `desks`).
- [x] Cerrar estructura final: `infrastructure/reservations` e `infrastructure/desks` por feature.
- [x] Cerrar estructura final: distribuir `application/ports` por feature (dejar `common` solo para transversales).
- [x] Cerrar estructura final: retirar restos legacy en `application/usecases/*` y alinear docs internos.
- [x] Retirar facades `*.usecase` por feature (prioridad: `desks` -> `reservations` -> `auth`) sin cambios funcionales HTTP.
- [x] Desks: eliminar `application/desks/handlers/desk.usecase.ts` y consumir `queries/list-desks.handler.ts` desde composition/controller.
- [x] Reservations: eliminar `application/reservations/handlers/reservation.usecase.ts` y conectar handlers de command/query directos.
- [x] Auth: eliminar `application/auth/handlers/auth.usecase.ts` y conectar handlers de command/query directos.
- [x] Mantener `interfaces/http` como eje por feature y alinear nomenclatura/rutas de imports.
- [ ] Evitar movimientos transversales en una sola PR; una PR por feature con tests en verde.

### Deuda técnica previa (alta prioridad)
- [x] Corregir flujo de refresh token para no emitir access token con payload parcial/vacío.
- [x] Eliminar `any` en factories transaccionales de `composition/auth.container`.
- [x] Normalizar imports/extensiones inconsistentes.

### Backlog de hardening (post-refactor de capas)
- [x] Endurecer `TransactionalContext` en `application` (tipo más opaco, sin fugas de detalles de infraestructura).
- [x] Revisar factories transaccionales para que todas tipen contra puertos de `application` y `TransactionalContext`.
- [x] Evolucionar `confirmEmail` de `boolean` a resultado semántico (`confirmed | invalid_token | expired | already_confirmed`).
- [x] Revisar y distribuir `ports` por feature cuando aporte claridad (mantener `common` solo para contratos realmente transversales).
- [ ] Reorganizar tests por capa/feature para mejorar mantenibilidad (`application/*`, `infrastructure/*`, `interfaces/http/*`).
- [ ] Mover aquí cualquier mejora arquitectónica detectada durante implementación para ejecutarla tras cerrar el refactor de capas.

### Criterios de aceptación
- [ ] Sin imports ilegales entre capas (application no depende de infrastructure/interfaces).
- [ ] Sin regresiones funcionales en auth/reservations/desks.
- [ ] Tests backend pasando al 100% tras cada fase.
- [ ] Documentación (AI-GUIDE/ARCHITECTURE/TASKS/CHANGELOG) actualizada al cierre.



## Siguiente bloque: interfaces/http (cierre v0.6.0)

Objetivo: cerrar la capa HTTP sin cambiar contratos funcionales, mejorando mantenibilidad y coherencia por feature.

### Alcance acordado
- [x] Extraer validaciones Zod por feature a `interfaces/http/<feature>/schemas/*`.
- [x] Extraer mapeos request/response por feature a `interfaces/http/<feature>/mappers/*`.
- [x] Reducir acoplamiento de controladores a `FastifyInstance` completo (inyectar solo dependencias necesarias cuando aplique).
- [x] Homogeneizar nomenclatura e imports dentro de `interfaces/http`.
- [x] Reducir duplicaciones de `preHandler` de autenticación con helper reutilizable.

### Orden de ejecución propuesto
- [x] Paso 1: `desks` (scope pequeño, baja complejidad).
- [x] Paso 2: `reservations` (validación+mapeo y auth preHandler).
- [x] Paso 3: `auth` (partir controlador en schemas/mappers sin tocar endpoints).

### Regla de seguridad
- [ ] Sin cambios de contrato HTTP (payloads, códigos, rutas).
- [ ] Tests de rutas/controladores en verde tras cada paso.
- [ ] `lint`, `lint:types` y `build` en verde por paso.



