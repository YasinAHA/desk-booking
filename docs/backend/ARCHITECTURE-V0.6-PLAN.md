# Architecture Checklist (v0.6.0)

Estado: documento de ejecución priorizado para la v0.6.0.

## Contexto
- El proyecto ya tiene avance funcional relevante.
- Aún así, sigue en una etapa donde ajustar estructura es razonable.
- Objetivo: definir bien capas y límites ahora para evitar refactor más costoso despues.

## Decision base (a validar)
- Enfoque recomendado: **layer-first en el core** + **agrupacion por feature dentro de capa**.
- CQRS en `application` (commands/queries), no en infraestructura.
- Adaptadores HTTP/DB fuera del core.
- Composition root separado de `interfaces/http`.

## Estructura objetivo (high-level)
```text
backend/src/
  shared/
  composition/
  domain/<feature>/(entities|value-objects|policies)
  application/<feature>/(commands|queries|handlers|ports)
  infrastructure/<feature>/(repositories|mappers|security)
  interfaces/http/<feature>/(routes|controller|adapters)
  workers/
```

## Checklist de arquitectura estricta
- [ ] `domain` no depende de framework/libs externas de infraestructura.
- [ ] `application` solo depende de `domain` y `ports`.
- [ ] `interfaces/http` no accede a Postgres directamente.
- [ ] `interfaces/http` no importa repositorios `pg-*` ni detalles de infraestructura.
- [ ] `infrastructure` implementa puertos de `application`.
- [ ] Commands y queries separados en `application` (aunque compartan tabla).
- [ ] Queries retornan DTOs/read models (no entidades de dominio).
- [ ] Commands retornan `void | id | result` (no entidades de dominio completas expuestas fuera de `application`).
- [ ] Commands usan `transaction-manager` cuando hay cambios de estado/invariantes.
- [ ] Queries no realizan escrituras ni side-effects.
- [ ] Composition root fuera de controladores/rutas.
- [ ] Convención de nombres consistente (`kebab-case`, `value-objects`).
- [ ] `shared/` solo contiene código puro (sin IO ni dependencias a DB/email/fs/framework).

## Cambios candidatos (v0.6.0)
1. `interfaces/http/*/*.container.ts` -> `composition/*.container.ts`
- [x] Auth
- [x] Reservations
- [x] Desks

2. `domain/valueObjects` -> `domain/value-objects`
- [x] Renombre carpetas
- [x] Ajuste imports

3. `application/usecases` -> `application/<feature>`
- [x] Auth: separar command/query handlers (`application/auth/commands`, `application/auth/queries`, `application/auth/handlers`)
- [x] Reservations: separar command/query handlers (`application/reservations/commands`, `application/reservations/queries`, `application/reservations/handlers`)
- [x] Desks: estructurar handlers/queries (`application/desks/queries`, `application/desks/handlers`)

4. SQL bootstrap vs migraciones
- [x] Revisar `docker/postgres/init/001_init.sql` para minimizar duplicidades
- [x] Mantener `db/migrations` como fuente principal de esquema
- [x] `docker init` solo para bootstrap mínimo (extensiones y, si aplica, roles/permisos)
- [x] No crear tablas de negocio en `docker init`

## Decisiones concretas (aprobadas)
- [x] Enfoque objetivo: layer-first en core + agrupacion por feature dentro de cada capa.
- [x] `composition root` fuera de `interfaces/http`.
- [x] CQRS completo para `auth` y `reservations` en v0.6.0.
- [x] CQRS parcial para `desks` en v0.6.0 (completar solo si aparece complejidad real de escritura).
- [x] SQL bootstrap mínimo en Docker (`extensions` y, si aplica, roles/permisos).
- [x] Esquema de negocio en migraciones (`db/migrations`) como fuente única de verdad.
- [x] Convención de transición: objetivo final `handlers`; `usecases` permitido temporalmente durante el refactor.

## Fases recomendadas (sin big-bang)
- [x] Fase 1: mover composition root + eliminar `any` críticos.
- [x] Fase 2: renombre `value-objects` + imports.
- [x] Fase 3: refactor `application/auth` a command/query.
- [x] Fase 4: refactor `application/reservations`.
- [x] Fase 5: refactor `application/desks`.

## Pendientes para cerrar estructura objetivo
- [x] Reorganizar `domain` por feature (`domain/auth`, `domain/reservations`, `domain/desks`) y mantener entidades/value-objects/policies en su módulo.
- [x] Reorganizar `infrastructure` de `reservations` y `desks` por feature (salir de `infrastructure/repositories/*` genérico).
- [ ] Distribuir `application/ports` por feature cuando corresponda y dejar en `common` solo contratos transversales.
- [ ] Revisar y retirar restos legacy (`application/usecases/*` remanentes) y alinear `README` internos de capa.
- [ ] Completar hardening post-refactor (tipado opaco de transacciones, resultados semánticos, etc.) según `docs/backend/TASKS.md`.

## Estructura objetivo final (referencia)
```text
backend/src/
  app.ts
  server.ts

  config/
  shared/
  composition/

  domain/
    auth/(entities|value-objects|policies)
    reservations/(entities|value-objects|policies)
    desks/(entities|value-objects|policies)

  application/
    auth/(commands|queries|handlers|ports)
    reservations/(commands|queries|handlers|ports)
    desks/(commands|queries|handlers|ports)
    common/services/

  infrastructure/
    db/
    auth/(repositories|security|policies)
    reservations/(repositories|mappers)
    desks/(repositories|mappers)
    email/(mailer.ts|outbox)
    notifiers/
    services/

  interfaces/http/
    plugins/
    schemas/
    auth/(routes.ts|controller.ts|adapters)
    reservations/(routes.ts|controller.ts)
    desks/(routes.ts|controller.ts)
    metrics/(routes.ts)

  workers/
```

## Definition of Done por PR
- [ ] Tests backend en verde.
- [ ] Build TypeScript en verde.
- [ ] Sin imports ilegales entre capas.
- [ ] Docs actualizados (`TASKS`, `ARCHITECTURE`, `CHANGELOG` si aplica).

## Notas de alcance
- Mejoras de hardening arquitectónico detectadas durante el refactor (tipado opaco de transacciones, semántica rica de resultados, etc.) se registran en `docs/backend/TASKS.md` bajo `Backlog de hardening (post-refactor de capas)`.

## Preguntas abiertas (para acordar antes de ejecutar)
- [x] `handlers` vs `usecases`: objetivo final `handlers`; transición con `usecases` permitida.
- [x] Alcance de CQRS en `desks`: parcial en v0.6.0, ampliar solo si hay complejidad real.
- [x] SQL init en v0.6.0: bootstrap mínimo y esquema de negocio en migraciones.
- [ ] Si este documento temporal pasa a ADR/DECISION formal tras consenso.




