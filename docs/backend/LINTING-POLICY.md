# Linting Policy (Backend)

Politica operativa para mantener calidad estatica sin ruido innecesario.

## Objetivo
- Detectar problemas reales de arquitectura, seguridad y mantenibilidad antes de merge.
- Evitar falsos positivos que frenen el desarrollo sin aportar valor.

## Fuente de verdad
- El gate oficial es ESLint ejecutado en CI.
- SonarLint en VSCode es apoyo local; no sustituye el gate de CI.

## Comandos obligatorios
- `npm -w backend run lint`
- `npm -w backend run lint:architecture`
- `npm -w backend run lint:types`
- `npm -w backend run test`
- `npm -w backend run build`
- `npm -w backend run audit:prod`

## Criterio por capas
- `domain`: sin imports a `application`, `infrastructure`, `interfaces`, `composition`, `config`.
- `application`: sin imports a `infrastructure`, `interfaces`, `composition`.
- `infrastructure`: sin imports a `interfaces`, `composition`.
- `interfaces`: sin imports directos a `infrastructure`.
- `composition`: sin imports a `interfaces`.

## Severidad por contexto
- `src/**/*.ts` (codigo productivo): reglas estrictas.
- `src/**/*.test.ts` (tests): se permiten overrides puntuales para reducir ruido.

## Excepciones
- Cualquier excepcion temporal debe registrarse en `docs/backend/TASKS.md` con:
  - motivo tecnico,
  - alcance,
  - criterio de cierre.
- No se aceptan excepciones permanentes sin ADR.

## Regla de merge
- No se mergea a `next` ni `main` con `lint` en rojo.
- No se mergea a `next` ni `main` con `lint:architecture` en rojo.
- Si SonarLint detecta algo no cubierto por ESLint y aporta valor real, se ajusta regla/config o patron de codigo.
