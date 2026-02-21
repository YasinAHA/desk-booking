# ADR-0007: HTTP Naming Convention

## Status
Accepted

## Date
2026-02-21

## Scope
backend, interfaces/http, api-contract

## Context
El proyecto tenía reglas claras para capas y para naming de archivos/carpetas (`kebab-case`), pero no una convención explícita para el casing del contrato HTTP.
Durante la integración de OpenAPI se detectó mezcla de `snake_case` y `camelCase` en request/response, lo que aumenta riesgo de drift entre backend, frontend y documentación.

## Decision
- DB/SQL: `snake_case`.
- Dominio y aplicación (`domain`, `application`): `camelCase`.
- Contrato HTTP público (`interfaces/http`, OpenAPI, DTOs request/response): `camelCase`.
- La traducción de casing se realiza en mappers/adapters de `interfaces/http` o en repositorios de `infrastructure` cuando corresponda (row DB -> modelo interno).
- No introducir nuevas respuestas HTTP en `snake_case`.

## Consequences
### Positivas
- Contrato HTTP consistente para frontend JS/TS.
- Menor fricción en tipado y consumo de API.
- Menos drift entre implementación y OpenAPI.

### Costes
- Puede requerir refactor incremental en endpoints legacy que hoy exponen `snake_case`.
- Cambios de contrato deben tratarse como breaking si ya hay consumidores externos.

## Migration policy
- En v0.x se permite normalización controlada del contrato HTTP en bloques acotados.
- Cada cambio de naming debe actualizar en el mismo bloque:
  - mappers/controladores
  - tests HTTP
  - OpenAPI (`docs/openapi.json`)
  - changelog, si aplica
