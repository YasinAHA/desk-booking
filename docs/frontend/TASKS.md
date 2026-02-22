# Frontend Tasks

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
  - [ ] `npm -w frontend run lint` OK
  - [ ] `npm -w frontend run typecheck` OK
  - [ ] `npm -w frontend run test` OK
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
