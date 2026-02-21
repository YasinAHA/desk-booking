# Frontend Architecture

Arquitectura objetivo del frontend para desk-booking.

## Stack base
- React 18 + TypeScript + Vite.
- React Router.
- TanStack Query.
- Zod.
- Tailwind CSS + `clsx` + `tailwind-merge`.
- shadcn/ui + lucide-react.
- Vitest + Testing Library.
- Playwright.

## Principios operativos
- No hacer `fetch` directo en componentes.
- La UI no contiene lógica de negocio.
- Los tipos OpenAPI generados no se editan manualmente.
- Todos los errores HTTP se normalizan como `ApiError`.
- Arquitectura feature-first con aislamiento de módulos.
- `shared/` solo contiene utilidades realmente transversales.

## Capas
- `app/`: bootstrap, providers globales, router, configuración.
- `pages/`: composición de pantallas por ruta.
- `features/`: lógica por caso de uso (auth, reservations, desks, admin).
- `entities/`: tipos y mapeos de dominio de UI.
- `shared/`: utilidades transversales (api-client, ui-kit, hooks, config).

## Estructura de carpetas recomendada
- `src/app/`: composición (router, providers, layout, config).
- `src/shared/api/`: cliente HTTP, interceptores auth, `ApiError`.
- `src/shared/openapi/generated/`: tipos generados.
- `src/shared/lib/`: utilidades (`cn`, fechas, helpers).
- `src/shared/ui/`: componentes base reutilizables.
- `src/features/auth|desks|reservations|qr-checkin/`: api, schemas, model, queries, commands, ui.
- `src/pages/`: páginas agregadoras y fallback (`not-found`).
- `src/tests/msw/`: mocks de API para tests.

## Reglas de dependencia
- `pages` puede usar `features`, `entities`, `shared`.
- `features` puede usar `entities`, `shared`.
- `entities` puede usar `shared`.
- `shared` no depende de capas superiores.

## Estado
- Estado servidor: TanStack Query.
- Estado UI local: React state/context mínimo.
- Evitar stores globales salvo necesidad real documentada.

## API y contrato
- El backend es fuente de verdad.
- Tipos de API generados desde OpenAPI (`openapi-typescript`).
- Validación runtime de payloads con Zod en bordes críticos.

## Auth
- Access token + refresh token según contrato backend.
- Interceptor/wrapper HTTP con flujo:
  1. request con access token.
  2. si 401, intentar refresh una vez.
  3. reintentar request original.
  4. si falla refresh, logout y redirect login.
- Rol y autorización:
  1. Backend es la autoridad de seguridad.
  2. Frontend usa guards (`require-auth`, `require-admin`) solo para UX.
  3. Nunca confiar en el rol frontend para proteger recursos.

## Testing
- Unit/integration para componentes, hooks y servicios.
- e2e para flujos críticos: login, reserva, cancelación, check-in QR, admin QR.
- No acoplar tests de UI a detalles internos de implementación.

## Rendimiento
- Evitar `useMemo/useCallback` por defecto.
- Usar memoización solo con evidencia (profiler o renders costosos).
- Considerar virtualización en listas/grid grandes.
