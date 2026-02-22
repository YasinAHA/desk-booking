# Decisiones

Registro de decisiones clave para mantener coherencia tÃ©cnica.

## Formato y criterio
- `Scope`:
  - `core`: impacta al monorepo completo.
  - `backend`: impacta principalmente al backend.
  - `frontend`: impacta principalmente al frontend.
- `ADR`:
  - enlace a ADR cuando la decisiÃ³n tiene impacto tÃ©cnico duradero.
  - `-` cuando la decisiÃ³n es operativa o menor y no requiere ADR formal.
- Decisiones historicas relacionadas se pueden agrupar en un ADR fundacional para evitar fragmentacion innecesaria.

| Fecha | Scope | Decision | Motivo | ADR |
| --- | --- | --- | --- | --- |
| 2026-02-07 | core | Backend propio en Fastify + TypeScript | Control total de arquitectura y TFM orientado a backend desacoplado. | [ADR-0001](adr/ADR-0001-foundational-stack-and-governance.md) |
| 2026-02-07 | core | Postgres local vÃ­a Docker | Entorno reproducible y cercano a producciÃ³n. | [ADR-0001](adr/ADR-0001-foundational-stack-and-governance.md) |
| 2026-02-07 | core | Monorepo (backend + frontend) | EvoluciÃ³n coordinada y versionado Ãºnico. | [ADR-0001](adr/ADR-0001-foundational-stack-and-governance.md) |
| 2026-02-07 | core | Auth con JWT | Simplicidad, control de sesiones y compatibilidad con Fastify. | [ADR-0001](adr/ADR-0001-foundational-stack-and-governance.md) |
| 2026-02-07 | core | SemVer y changelog | Trazabilidad y hitos del TFM. | [ADR-0001](adr/ADR-0001-foundational-stack-and-governance.md) |
| 2026-02-07 | core | Documentar tags en README y changelog | Facilitar contexto de versiones previas y mantener histÃ³rico claro. | [ADR-0001](adr/ADR-0001-foundational-stack-and-governance.md) |
| 2026-02-08 | backend | v0.5.0 orientada a refactor arquitectÃ³nico | Reducir deuda tÃ©cnica aplicando SOLID/Clean Architecture. | [ADR-0003](adr/ADR-0003-layer-first-feature-grouping-v0.6.md) |
| 2026-02-08 | backend | Capas de arquitectura definidas | Separar domain, application, infrastructure e interfaces. | [ADR-0003](adr/ADR-0003-layer-first-feature-grouping-v0.6.md) |
| 2026-02-08 | backend | Use cases solo dependen de ports | Evitar acoplamientos entre use cases y con infraestructura. | [ADR-0003](adr/ADR-0003-layer-first-feature-grouping-v0.6.md) |
| 2026-02-08 | backend | Errores de dominio tipados | Evitar `Error("CODE")` y mapear en interfaces HTTP. | [ADR-0003](adr/ADR-0003-layer-first-feature-grouping-v0.6.md) |
| 2026-02-08 | backend | Respuestas de auth genÃ©ricas | Minimizar enumeraciÃ³n de cuentas en login/registro. | [ADR-0003](adr/ADR-0003-layer-first-feature-grouping-v0.6.md) |
| 2026-02-08 | backend | SerializaciÃ³n en infraestructura | Fechas/formatos se resuelven en adaptadores, no en use cases. | [ADR-0003](adr/ADR-0003-layer-first-feature-grouping-v0.6.md) |
| 2026-02-08 | backend | Constantes centralizadas | LÃ­mites y regex en `backend/src/config/constants.ts`. | [ADR-0003](adr/ADR-0003-layer-first-feature-grouping-v0.6.md) |
| 2026-02-15 | core | Estrategia de versionado por madurez | v1.0.0 como release interna (Camerfirma). Multi-org/SaaS se reserva para v2.0.0. | [ADR-0001](adr/ADR-0001-foundational-stack-and-governance.md) |
| 2026-02-16 | core | ConvenciÃ³n de mensajes de commit y tags en inglÃ©s | Mantener consistencia histÃ³rica, facilitar lectura en PRs/releases y evitar mezcla de idiomas en el historial. | [ADR-0002](adr/ADR-0002-commit-and-tag-language-english.md) |
| 2026-02-17 | backend | Arquitectura v0.6.0: layer-first + feature por capa | Modularizar sin romper Clean Architecture: composition root fuera de interfaces, CQRS en application (auth/reservations completo; desks parcial), y migraciones como fuente Ãºnica de esquema. | [ADR-0003](adr/ADR-0003-layer-first-feature-grouping-v0.6.md) |
| 2026-02-17 | backend | Migraciones como fuente Ãºnica de esquema | Reducir drift entre entornos limitando `docker init` a bootstrap mÃ­nimo. | [ADR-0004](adr/ADR-0004-migrations-as-single-source-of-truth.md) |
| 2026-02-17 | core | Estructura de docs para monorepo | Separar global/backend/frontend/adr y aislar planificaciÃ³n por alcance. | [ADR-0005](adr/ADR-0005-docs-structure-monorepo.md) |
| 2026-02-21 | backend | Reservas multi-dÃ­a pospuestas a post-entrega | Evitar complejidad y riesgo de regresiÃ³n por colisiones; priorizar estabilidad de flujos crÃ­ticos (reserva/cancelaciÃ³n/check-in/walk-in) para el hito del 23-02-2026. | - |
| 2026-02-21 | backend | OpenAPI basado en Zod como fuente Ãºnica de contrato HTTP | Reducir drift entre validaciÃ³n y documentaciÃ³n, minimizar duplicaciÃ³n y mejorar mantenibilidad del contrato API. | [ADR-0006](adr/ADR-0006-openapi-from-zod.md) |
| 2026-02-21 | backend | ConvenciÃ³n de naming para contrato HTTP | Establecer consistencia entre DB (`snake_case`), core (`camelCase`) y API HTTP (`camelCase`) para reducir drift y fricciÃ³n en frontend. | [ADR-0007](adr/ADR-0007-http-naming-convention.md) |
| 2026-02-22 | core | Refresh token en cookie HttpOnly con migraciÃ³n dual | Reducir superficie XSS del refresh token y alinear el flujo de sesiÃ³n web con prÃ¡ctica de producciÃ³n, evitando ruptura brusca durante la transiciÃ³n. | [ADR-0008](adr/ADR-0008-refresh-token-http-only-cookie.md) |
| 2026-02-22 | core | Refresh token en cookie HttpOnly con migracion dual | Reducir superficie XSS del refresh token y alinear el flujo de sesion web con practica de produccion, evitando ruptura brusca durante la transicion. | [ADR-0008](adr/ADR-0008-refresh-token-http-only-cookie.md) |
| 2026-02-21 | core | Estrategia global de quality gates y observabilidad | Definir `husky` en raÃ­z del monorepo (pre-commit/pre-push) y estrategia Sentry por entorno para backend/frontend sin exponer datos sensibles. | - |
| 2026-02-21 | core | ImplementaciÃ³n inicial de quality gates globales y base Sentry | Activados hooks `husky` en raÃ­z con gates de backend; variables Sentry globales aÃ±adidas para habilitaciÃ³n progresiva sin bloqueo de entrega. | - |





