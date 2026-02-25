# Frontend Tasks

## Plan activo
- [x] Plan de rediseño documentado en docs/frontend/REDESIGN-PLAN.md.
- [ ] Ejecutar fases F1 -> F5 del rediseño visual sin regresión funcional.

## v0.8.x - Bootstrap frontend serio
- [x] Inicializar app React + TypeScript + Vite.
- [x] Configurar Router y layout base.
- [x] Integrar TanStack Query y QueryClientProvider.
- [x] Integrar Tailwind + sistema de componentes base (shadcn/ui).
- [x] Configurar cliente API con auth/refresh/retry.
- [x] Integrar tipos OpenAPI en build.

## v0.8.x - Siguiente tarea (aliases)
- [x] Introducir aliases de imports en frontend para eliminar rutas relativas largas y mejorar mantenibilidad.
- [x] Configurar aliases en TypeScript (`frontend/tsconfig.app.json` y `frontend/tsconfig.node.json` si aplica):
  - [x] `@app/*` -> `src/app/*`
  - [x] `@pages/*` -> `src/pages/*`
  - [x] `@features/*` -> `src/features/*`
  - [x] `@shared/*` -> `src/shared/*`
- [x] Configurar los mismos aliases en `frontend/vite.config.ts` para app y tests.
- [x] Migrar imports existentes (sin refactor masivo):
  - [x] Reemplazar rutas relativas largas por aliases en archivos del bloque actual y relacionados.
  - [x] Mantener consistencia y seguridad, sin refactor masivo innecesario.
- [x] Ajustar tests/config si rompe resolucion.
- [x] Criterios de aceptacion:
  - [x] `npm -w frontend run lint` OK
  - [x] `npm -w frontend run typecheck` OK
  - [x] `npm -w frontend run test` OK
  - [x] Sin cambios funcionales (solo resolucion de modulos/imports).
  - [x] Sin tocar backend ni `docs/architecture-audit`.
- [x] Entrega:
  - [x] Commit sugerido: `refactor(frontend): add path aliases and migrate imports`
  - [x] Resumen con aliases definidos, convencion aplicada, archivos migrados y validaciones ejecutadas.

## v0.8.x - Flujos funcionales minimos
- [x] Login / logout.
- [x] Vista de desks por fecha.
- [x] Crear y cancelar reserva.
- [x] Check-in por QR (flujo web).
- [x] Pantalla admin de QR (listar, regenerar uno, regenerar todos).

## v0.8.x - Cierre frontend entrega (prioridad alta)
- [x] Separar la UI actual por rutas dedicadas (evitar "todo en una sola página"):
  - [x] `/desks` (reserva y listado de puestos).
  - [x] `/reservations` (mis reservas y cancelación).
  - [x] `/check-in` (flujo QR principal; entrada manual solo fallback discreto).
- [x] Crear vista dedicada de administración:
  - [x] `/admin/desks` para QR y gestión operativa de desks.
  - [x] Mantener bloqueo por rol/permiso con UX clara de acceso denegado.
- [ ] Completar flujos auth faltantes:
  - [ ] `/register` (registro).
  - [ ] `/forgot-password` (sin sesión).
  - [ ] `/reset-password` (desde enlace/token).
  - [ ] `/change-password` (con sesión iniciada).
- [ ] Añadir página `/profile`:
  - [ ] Datos de cuenta visibles.
  - [ ] Punto de entrada a cambio de contraseña autenticado.
- [ ] Criterios de aceptación del bloque:
  - [x] `npm -w frontend run lint` OK
  - [x] `npm -w frontend run typecheck` OK
  - [x] `npm -w frontend run test` OK
  - [ ] Sin regresión en login/refresh/logout.

## v0.8.x - Auth cookie migration (ADR-0008)
- [x] Migrar frontend a refresh token por cookie HttpOnly (sin persistir refresh en storage).
- [x] Cliente HTTP auth con `credentials: "include"` para login/refresh/logout.
- [x] Bootstrap de sesión con silent refresh al arrancar app.
- [x] Logout alineado con backend cookie-only.
- [x] Eliminar dependencia de refresh token en storage.
- [x] Migrar access token a memoria (sin `localStorage`).
- [x] Validar UX de sesión al recargar (sesión vigente y sesión expirada).
- [x] Criterios de aceptación:
  - [x] `npm -w frontend run lint` OK
  - [x] `npm -w frontend run typecheck` OK
  - [x] `npm -w frontend run test` OK
  - [x] Sin regresión en login/refresh/logout.

## Calidad
- [x] ESLint + Prettier + scripts quality.
- [x] Husky + lint-staged.
- [x] Vitest + Testing Library para flujos clave.
- [ ] Playwright e2e smoke de rutas criticas.

## Pendiente (no bloquear bootstrap)
- [ ] Front observability minima (logger con niveles).
- [ ] Virtualizacion de listas si volumen real lo requiere.
- [ ] Internacionalizacion (si aplica al alcance final).

## v0.8.x - Organizacion tecnica (ajustes de estructura)
- [x] Mover guards de autenticacion/autorizacion a `app/router/guards` (fuera de `features/*/ui`).
- [x] Unificar nombre de hoja global de estilos (`global.css` o `globals.css`) y aplicar una sola convencion.
- [x] Reorganizar `features/auth/model` en submodulo `session/*` para escalabilidad.
- [x] Blindar fronteras por alias en ESLint:
  - [x] `@shared/**` no importa de `@app/**`, `@pages/**`, `@features/**`.
  - [x] `@features/**` no importa de `@app/**` ni `@pages/**`.
  - [x] `@pages/**` solo importa de `@features/**` y `@shared/**`.
  - [x] `@app/**` actua como capa de composicion (puede importar del resto).
- [x] Prohibir imports directos de `@shared/openapi/generated/**` fuera de un wrapper estable.
- [ ] Criterios de aceptacion del bloque:
  - [x] `npm -w frontend run lint` OK
  - [x] `npm -w frontend run typecheck` OK
  - [x] `npm -w frontend run test` OK






## v0.8.x - UX feedback y confirmaciones (criterio fijo)
- [ ] Definir y documentar criterio UX de feedback:
  - [ ] `Dialog` para confirmaciones destructivas.
  - [ ] `Toast` para resultado de acciones (ok/error).
  - [ ] `Alert` inline solo para estado de pantalla (load/error/empty/forbidden).
  - [ ] No usar `alert()` / `confirm()` nativos.
- [x] Integrar infraestructura UI minima para feedback reutilizable (Dialog + Toast).
- [ ] Migrar cancelacion de reserva:
  - [x] Sustituir `confirm()` por modal de confirmacion.
  - [x] Mostrar resultado por toast.
- [ ] Ajustar navegacion auth:
  - [x] Redirigir `/login` -> `/desks` cuando ya hay sesion iniciada.
- [x] Limpiar feedback transaccional inline donde ya se use toast.
- [ ] Criterios de aceptacion:
  - [x] `npm -w frontend run lint` OK
  - [x] `npm -w frontend run typecheck` OK
  - [x] `npm -w frontend run test` OK

## v0.8.x - Modern enterprise light (estilo centralizado)
- [x] Definir direccion visual unica y tokens globales:
  - [x] Tipografia principal moderna y legible para producto interno.
  - [x] Paleta light profesional (sin sesgo morado).
  - [x] Radios, sombras y espaciado normalizados.
- [x] Centralizar estilo en primitives (`Button`, `Card`, `Input`, `Badge`, `Alert`, `Toast`, `Dialog`).
- [ ] Reducir duplicacion visual en features (usar primitives/patrones).
- [ ] Criterios de aceptacion:
  - [ ] Cambios visuales globales sin editar cada feature.
  - [x] `npm -w frontend run lint` OK
  - [x] `npm -w frontend run typecheck` OK
  - [x] `npm -w frontend run test` OK
## v0.8.x - Merge por fases al frontend principal (puente -> frontend)
- [ ] Fase 1 (router/layout/auth):
  - [ ] Migrar shell de navegacion y layout base sin tocar logica de negocio.
  - [ ] Consolidar guards en `app/router/guards` y flujo de sesion actual.
  - [ ] Mantener rutas actuales funcionales (`/login`, `/desks`, `/reservations`, `/check-in`, `/admin/desks`).
- [ ] Fase 2 (design system y primitives):
  - [ ] Integrar tokens visuales y componentes base reutilizables.
  - [ ] Sustituir estilos locales duplicados por primitives comunes.
- [ ] Fase 3 (features funcionales):
  - [ ] Migrar vistas de dashboard/desks/reservations sobre APIs reales.
  - [ ] Marcar como "Proximamente" cualquier bloque no soportado por backend.
- [ ] Fase 4 (admin/qr):
  - [ ] Integrar panel admin QR completo con estados de carga/error/toast.
  - [ ] Validar regeneracion individual/masiva e impresion.
- [ ] Fase 5 (hardening):
  - [ ] Cerrar deuda visual y tecnica de rutas, accesibilidad y feedback UX.
  - [ ] Ejecutar quality gates finales (lint/typecheck/test/build).

