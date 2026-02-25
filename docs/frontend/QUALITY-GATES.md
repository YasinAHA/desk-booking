# Frontend Quality Gates

## Gate obligatorio local
- `lint` OK.
- `typecheck` OK.
- `test` OK.

## Husky (monorepo)
- Configuración en raíz del repo.
- `pre-commit`: `lint` + `typecheck`.
- `pre-push`: `test`.
- Objetivo: gate único para backend y frontend.

## Gate obligatorio CI
- `lint`.
- `typecheck`.
- `test`.
- `build`.
- `e2e` (al menos smoke suite).

## Criterios de PR
- Sin warnings críticos de ESLint/Sonar.
- Sin `any` injustificado.
- Sin deuda de contrato API sin ticket asociado.
- Documentación actualizada cuando cambie comportamiento visible.

## Criterios de arquitectura
- Respeto de capas (`app/pages/features/entities/shared`).
- Sin lógica de negocio backend en componentes UI.
- Acceso API centralizado (sin fetch sueltos por componentes).
- Features aisladas; `shared` solo para código transversal.

## Criterios de testing
- Unit/integration para hooks/servicios nuevos.
- e2e para nuevos flujos críticos.
- No snapshots masivos sin valor funcional.
