# Backend Tasks (v0.6.0)

Este fichero contiene las tareas activas de backend.

## v0.6.0 (Prioridad) Arquitectura y modularidad

Objetivo: modularizar internamente por feature de forma incremental, sin big-bang y sin regresiones.

### Fuente prioritaria de ejecución
- [x] Ejecutar y mantener actualizado `docs/backend/archive/ARCHITECTURE-V0.6-PLAN.md` como checklist operativo de v0.6.0 (cerrado y archivado).
- [x] Reflejar en este fichero solo el estado resumido por fases/hitos y decisiones cerradas.

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
- [x] Evitar movimientos transversales en una sola PR; una PR por feature con tests en verde.

### Deuda técnica previa (alta prioridad)
- [x] Corregir flujo de refresh token para no emitir access token con payload parcial/vacío.
- [x] Eliminar `any` en factories transaccionales de `composition/auth.container`.
- [x] Normalizar imports/extensiones inconsistentes.

### Backlog de hardening (post-refactor de capas)
- [x] Endurecer `TransactionalContext` en `application` (tipo más opaco, sin fugas de detalles de infraestructura).
- [x] Revisar factories transaccionales para que todas tipen contra puertos de `application` y `TransactionalContext`.
- [x] Evolucionar `confirmEmail` de `boolean` a resultado semántico (`confirmed | invalid_token | expired | already_confirmed`).
- [x] Revisar y distribuir `ports` por feature cuando aporte claridad (mantener `common` solo para contratos realmente transversales).
- [x] Reorganizar tests por capa/feature para mejorar mantenibilidad (`application/*`, `infrastructure/*`, `interfaces/http/*`).
- [x] Auth: dividir test agregado en tests por unidad (`commands`/`queries`) y naming `kebab-case`.
- [x] Reservations y desks: mantener patrón de granularidad por handler/route (sin sobre-fragmentar tests de rutas).
- [x] Mover mejoras arquitectónicas detectadas durante implementación a seguimiento permanente en `docs/architecture-audit/ARCHITECTURE-AUDIT-v0.X.md` y `docs/backend/ARCHITECTURE-BACKEND.md`.

### Criterios de aceptación
- [x] Sin imports ilegales entre capas (application no depende de infrastructure/interfaces).
- [x] Sin regresiones funcionales en auth/reservations/desks.
- [x] Tests backend pasando al 100% tras cada fase.
- [x] Documentación (AI-GUIDE/ARCHITECTURE/TASKS/CHANGELOG) actualizada al cierre.



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
- [x] Sin cambios de contrato HTTP (payloads, códigos, rutas).
- [x] Tests de rutas/controladores en verde tras cada paso.
- [x] `lint`, `lint:types` y `build` en verde por paso.

## v0.7.0 (Planificado) Recuperación y cambio de contraseña

Objetivo: incorporar recuperación/cambio de contraseña con foco en seguridad, anti-enumeración y UX consistente.

### Deuda arquitectónica abierta (derivada de audit v0.X)
- [x] Reservations: ejecutar `create reservation` en una transacción de aplicación explícita (checks + create).
- [x] Reservations: separar semántica de errores de fecha (`invalid` vs `past`) y mapear en HTTP.
- [x] Domain: evolucionar `Desk` y `Reservation` de type alias a entidades con comportamiento cuando aplique.
- [x] Reservations VO: forzar formato estricto `YYYY-MM-DD` (zero-padded) en `reservation-date`.
- [x] Auth: mover orquestación de lifecycle de token a frontera de `application/auth` (controller más delgado).
- [x] Application common: endurecer tipado de `transaction-manager` para eliminar `Promise<any>`/shape SQL expuesto.
- [x] Infrastructure repositories: eliminar `any` en row mappings (`auth`, `reservations`, `desks`).
  - [x] `auth`: tipado explícito aplicado en `pg-user-repository`, `pg-email-verification-repository` y `pg-email-outbox`.
  - [x] `reservations`: tipado explícito aplicado en `pg-reservation-command-repository` y `pg-reservation-query-repository`.
  - [x] `desks`: tipado explícito aplicado en `pg-desk-repository`.
- [x] HTTP/Fastify typing: quitar `(req as any).body` en `app.ts` con parser tipado.
- [x] Token revocation repo: sustituir `Error` genérico por error tipado con `cause`.
- [x] Auth query path: revisar/eliminar transacción en `LoginHandler` si no hay requisito de consistencia documentado.

### Hardening previo (prioridad alta)
- [x] Implementar refresh token rotation real en `POST /auth/refresh`.
- [x] Revocar el refresh token usado (`jti`) en `token_revocation`.
- [x] Emitir nuevo `accessToken` y nuevo `refreshToken` en cada refresh exitoso.
- [x] Ajustar tests unitarios/integración de auth para cubrir rotación y revocación.

### Alcance funcional
- [x] Añadir `POST /auth/forgot-password` con respuesta genérica uniforme (sin revelar existencia de cuenta).
- [x] Añadir `POST /auth/reset-password` con token de un solo uso y expiración.
- [x] Añadir `POST /auth/change-password` para usuario autenticado (requiere contraseña actual).
- [x] Invalidar sesiones/tokens activas tras `reset-password` y `change-password`.

### Seguridad y anti-enumeración
- [x] Mantener mensaje y código de respuesta equivalentes para cuenta existente/no existente en `forgot-password`.
- [x] Aplicar rate limit por IP y por email (o hash de email) en endpoints de recuperación.
- [x] Evitar reutilización de token y validar expiración estricta.
- [x] Registrar eventos de seguridad (`password_reset_requested`, `password_reset_completed`, intentos inválidos).
- [x] Evitar filtrado por timing apreciable entre casos válidos e inválidos cuando aplique.

### Arquitectura y datos
- [x] Definir puertos y handlers CQRS en `application/auth` para recuperación/cambio de contraseña.
- [x] Crear repositorio/tabla de reset tokens hasheados (nunca token en claro persistido).
- [x] Mantener reglas de dominio y errores de aplicación sin depender de traducción de errores SQL para lógica principal.
- [x] Añadir migración dedicada para reset tokens y política de limpieza/expiración.

### UX y contrato API
- [x] Mensajería neutra y clara en recuperación para minimizar enumeración sin degradar UX.
- [x] Documentar payloads/respuestas en `docs/backend/API.md`.
- [x] Mantener coherencia con política actual de auth (respuestas genéricas donde aplique).
- [x] Flujo producción reset password sin copia manual de token (autocaptura en frontend desde URL).
- [x] Mover token de `query string` a `URL fragment` (`#token=`) para reducir exposición en logs/intermediarios.
- [x] Mantener formulario de pegado manual de token solo como fallback de desarrollo/soporte.
 
### Validación
- [x] Tests unitarios de handlers (casos felices y errores de seguridad).
- [x] Tests de integración HTTP para tokens inválidos/expirados/reutilizados.
- [x] `lint`, `lint:types`, `build` y `test` en verde.



