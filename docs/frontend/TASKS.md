# Frontend Tasks

## v0.8.x - Bootstrap frontend serio
- [x] Inicializar app React + TypeScript + Vite.
- [x] Configurar Router y layout base.
- [x] Integrar TanStack Query y QueryClientProvider.
- [x] Integrar Tailwind + sistema de componentes base (shadcn/ui).
- [x] Configurar cliente API con auth/refresh/retry.
- [x] Integrar tipos OpenAPI en build.

## v0.8.x - Siguiente tarea (aliases)
- [ ] Introducir aliases de imports en frontend para eliminar rutas relativas largas y mejorar mantenibilidad.
- [ ] Configurar aliases en TypeScript (`frontend/tsconfig.app.json` y `frontend/tsconfig.node.json` si aplica):
  - [ ] `@app/*` -> `src/app/*`
  - [ ] `@pages/*` -> `src/pages/*`
  - [ ] `@features/*` -> `src/features/*`
  - [ ] `@shared/*` -> `src/shared/*`
- [ ] Configurar los mismos aliases en `frontend/vite.config.ts` para app y tests.
- [ ] Migrar imports existentes (sin refactor masivo):
  - [ ] Reemplazar rutas relativas largas por aliases en archivos del bloque actual y relacionados.
  - [ ] Mantener consistencia y seguridad, sin refactor masivo innecesario.
- [ ] Ajustar tests/config si rompe resolucion.
- [ ] Criterios de aceptacion:
  - [ ] `npm -w frontend run lint` OK
  - [ ] `npm -w frontend run typecheck` OK
  - [ ] `npm -w frontend run test` OK
  - [ ] Sin cambios funcionales (solo resolucion de modulos/imports).
  - [ ] Sin tocar backend ni `docs/architecture-audit`.
- [ ] Entrega:
  - [ ] Commit sugerido: `refactor(frontend): add path aliases and migrate imports`
  - [ ] Resumen con aliases definidos, convencion aplicada, archivos migrados y validaciones ejecutadas.

## v0.8.x - Flujos funcionales minimos
- [x] Login / logout.
- [x] Vista de desks por fecha.
- [x] Crear y cancelar reserva.
- [x] Check-in por QR (flujo web).
- [x] Pantalla admin de QR (listar, regenerar uno, regenerar todos).

## Calidad
- [x] ESLint + Prettier + scripts quality.
- [ ] Husky + lint-staged.
- [x] Vitest + Testing Library para flujos clave.
- [ ] Playwright e2e smoke de rutas criticas.

## Pendiente (no bloquear bootstrap)
- [ ] Front observability minima (logger con niveles).
- [ ] Virtualizacion de listas si volumen real lo requiere.
- [ ] Internacionalizacion (si aplica al alcance final).
