# Decisiones

Registro de decisiones clave para mantener coherencia técnica.

## Formato y criterio
- `Scope`:
  - `core`: impacta al monorepo completo.
  - `backend`: impacta principalmente al backend.
  - `frontend`: impacta principalmente al frontend.
- `ADR`:
  - enlace a ADR cuando la decisión tiene impacto técnico duradero.
  - `-` cuando la decisión es operativa o menor y no requiere ADR formal.
- Decisiones historicas relacionadas se pueden agrupar en un ADR fundacional para evitar fragmentacion innecesaria.

| Fecha | Scope | Decision | Motivo | ADR |
| --- | --- | --- | --- | --- |
| 2026-02-07 | core | Backend propio en Fastify + TypeScript | Control total de arquitectura y TFM orientado a backend desacoplado. | [ADR-0001](adr/ADR-0001-foundational-stack-and-governance.md) |
| 2026-02-07 | core | Postgres local vía Docker | Entorno reproducible y cercano a producción. | [ADR-0001](adr/ADR-0001-foundational-stack-and-governance.md) |
| 2026-02-07 | core | Monorepo (backend + frontend) | Evolución coordinada y versionado único. | [ADR-0001](adr/ADR-0001-foundational-stack-and-governance.md) |
| 2026-02-07 | core | Auth con JWT | Simplicidad, control de sesiones y compatibilidad con Fastify. | [ADR-0001](adr/ADR-0001-foundational-stack-and-governance.md) |
| 2026-02-07 | core | SemVer y changelog | Trazabilidad y hitos del TFM. | [ADR-0001](adr/ADR-0001-foundational-stack-and-governance.md) |
| 2026-02-07 | core | Documentar tags en README y changelog | Facilitar contexto de versiones previas y mantener histórico claro. | [ADR-0001](adr/ADR-0001-foundational-stack-and-governance.md) |
| 2026-02-08 | backend | v0.5.0 orientada a refactor arquitectónico | Reducir deuda técnica aplicando SOLID/Clean Architecture. | [ADR-0003](adr/ADR-0003-layer-first-feature-grouping-v0.6.md) |
| 2026-02-08 | backend | Capas de arquitectura definidas | Separar domain, application, infrastructure e interfaces. | [ADR-0003](adr/ADR-0003-layer-first-feature-grouping-v0.6.md) |
| 2026-02-08 | backend | Use cases solo dependen de ports | Evitar acoplamientos entre use cases y con infraestructura. | [ADR-0003](adr/ADR-0003-layer-first-feature-grouping-v0.6.md) |
| 2026-02-08 | backend | Errores de dominio tipados | Evitar `Error("CODE")` y mapear en interfaces HTTP. | [ADR-0003](adr/ADR-0003-layer-first-feature-grouping-v0.6.md) |
| 2026-02-08 | backend | Respuestas de auth genéricas | Minimizar enumeración de cuentas en login/registro. | [ADR-0003](adr/ADR-0003-layer-first-feature-grouping-v0.6.md) |
| 2026-02-08 | backend | Serialización en infraestructura | Fechas/formatos se resuelven en adaptadores, no en use cases. | [ADR-0003](adr/ADR-0003-layer-first-feature-grouping-v0.6.md) |
| 2026-02-08 | backend | Constantes centralizadas | Límites y regex en `backend/src/config/constants.ts`. | [ADR-0003](adr/ADR-0003-layer-first-feature-grouping-v0.6.md) |
| 2026-02-15 | core | Estrategia de versionado por madurez | v1.0.0 como release interna (Camerfirma). Multi-org/SaaS se reserva para v2.0.0. | [ADR-0001](adr/ADR-0001-foundational-stack-and-governance.md) |
| 2026-02-16 | core | Convención de mensajes de commit y tags en inglés | Mantener consistencia histórica, facilitar lectura en PRs/releases y evitar mezcla de idiomas en el historial. | [ADR-0002](adr/ADR-0002-commit-and-tag-language-english.md) |
| 2026-02-17 | backend | Arquitectura v0.6.0: layer-first + feature por capa | Modularizar sin romper Clean Architecture: composition root fuera de interfaces, CQRS en application (auth/reservations completo; desks parcial), y migraciones como fuente única de esquema. | [ADR-0003](adr/ADR-0003-layer-first-feature-grouping-v0.6.md) |
| 2026-02-17 | backend | Migraciones como fuente única de esquema | Reducir drift entre entornos limitando `docker init` a bootstrap mínimo. | [ADR-0004](adr/ADR-0004-migrations-as-single-source-of-truth.md) |
| 2026-02-17 | core | Estructura de docs para monorepo | Separar global/backend/frontend/adr y aislar planificación por alcance. | [ADR-0005](adr/ADR-0005-docs-structure-monorepo.md) |
| 2026-02-21 | backend | Reservas multi-día pospuestas a post-entrega | Evitar complejidad y riesgo de regresión por colisiones; priorizar estabilidad de flujos críticos (reserva/cancelación/check-in/walk-in) para el hito del 23-02-2026. | - |
| 2026-02-21 | backend | OpenAPI basado en Zod como fuente única de contrato HTTP | Reducir drift entre validación y documentación, minimizar duplicación y mejorar mantenibilidad del contrato API. | [ADR-0006](adr/ADR-0006-openapi-from-zod.md) |
| 2026-02-21 | backend | Convención de naming para contrato HTTP | Establecer consistencia entre DB (`snake_case`), core (`camelCase`) y API HTTP (`camelCase`) para reducir drift y fricción en frontend. | [ADR-0007](adr/ADR-0007-http-naming-convention.md) |
| 2026-02-21 | core | Estrategia global de quality gates y observabilidad | Definir `husky` en raíz del monorepo (pre-commit/pre-push) y estrategia Sentry por entorno para backend/frontend sin exponer datos sensibles. | - |
| 2026-02-21 | core | Implementación inicial de quality gates globales y base Sentry | Activados hooks `husky` en raíz con gates de backend; variables Sentry globales añadidas para habilitación progresiva sin bloqueo de entrega. | - |



