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
- [ ] Renombre carpetas
- [ ] Ajuste imports

3. `application/usecases` -> `application/<feature>`
- [ ] Auth: separar command/query handlers (transición aplicada: `application/auth/handlers/auth.usecase.ts`)
- [ ] Reservations: separar command/query handlers
- [ ] Desks: estructurar handlers/queries

4. SQL bootstrap vs migraciones
- [ ] Revisar `docker/postgres/init/001_init.sql` para minimizar duplicidades
- [ ] Mantener `db/migrations` como fuente principal de esquema
- [ ] `docker init` solo para bootstrap mínimo (extensiones y, si aplica, roles/permisos)
- [ ] No crear tablas de negocio en `docker init`

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
- [ ] Fase 2: renombre `value-objects` + imports.
- [ ] Fase 3: refactor `application/auth` a command/query.
- [ ] Fase 4: refactor `application/reservations`.
- [ ] Fase 5: refactor `application/desks`.

## Definition of Done por PR
- [ ] Tests backend en verde.
- [ ] Build TypeScript en verde.
- [ ] Sin imports ilegales entre capas.
- [ ] Docs actualizados (`TASKS`, `ARCHITECTURE`, `CHANGELOG` si aplica).

## Preguntas abiertas (para acordar antes de ejecutar)
- [x] `handlers` vs `usecases`: objetivo final `handlers`; transición con `usecases` permitida.
- [x] Alcance de CQRS en `desks`: parcial en v0.6.0, ampliar solo si hay complejidad real.
- [x] SQL init en v0.6.0: bootstrap mínimo y esquema de negocio en migraciones.
- [ ] Si este documento temporal pasa a ADR/DECISION formal tras consenso.




