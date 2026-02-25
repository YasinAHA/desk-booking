# ADR-0006: Estrategia de documentación OpenAPI (Swagger) basada en Zod

## Status
Accepted

## Date
2026-02-21

## Scope
backend, interfaces/http, documentation, api-contract

## Context
El proyecto expone una API HTTP implementada con Fastify y TypeScript, siguiendo Clean Architecture.
Se requiere documentación OpenAPI/Swagger por motivos de:
- Trazabilidad del contrato HTTP (TFM + evolución profesional del proyecto)
- Facilitación de pruebas manuales (Swagger UI)
- Comunicación clara del contrato para frontend y/o consumidores futuros
- Reducción de deriva (drift) entre validación real y documentación

Actualmente existen esquemas de validación definidos en Zod para las entradas (request body, querystring, etc.). Documentar manualmente en YAML o repetir esquemas como JSON Schema por ruta aumenta:
- Duplicación
- Riesgo de inconsistencias
- Coste de mantenimiento

## Decision
Adoptar **Zod como fuente única de verdad** (single source of truth) para validación de entrada y generación de documentación OpenAPI, mediante **@asteasolutions/zod-to-openapi**.

Se generará un documento OpenAPI (JSON) a partir de los esquemas Zod, incluyendo:
- `components/schemas` reutilizables (ej. ErrorResponse, AuthUser, Tokens, etc.)
- `paths` por endpoint con requestBody/parameters/responses
- `securitySchemes` (bearerAuth para JWT)
- metadata (descriptions, examples) definida junto al schema Zod cuando aplique

El documento OpenAPI se servirá a través de Swagger UI en entornos no productivos (o protegido en producción si se requiere).

Implementación actual:
- Builder en `backend/src/interfaces/http/openapi/document.ts`.
- Exposición de `/docs` y `/openapi.json` desde `backend/src/interfaces/http/plugins/swagger.ts`.
- Export estático con `npm -w backend run docs:openapi` (`backend/scripts/export-openapi.ts` -> `docs/openapi.json`).

## Rationale
### Beneficios
- **Consistencia**: validación real y documentación se derivan del mismo schema.
- **Mantenibilidad**: se evita reescribir y sincronizar JSON Schema / YAML manual.
- **Calidad de documentación**: soporta descriptions y examples de forma nativa.
- **Alineación con Clean Architecture**: la documentación pertenece a `interfaces/http`, no contamina dominio ni aplicación.
- **Versionado**: el spec puede exportarse y versionarse junto al código.

### Trade-offs
- Se introduce una dependencia adicional (`@asteasolutions/zod-to-openapi`).
- Requiere una convención clara para nombrar y registrar componentes (schemas) y rutas (paths).
- La generación del spec exige una capa de ensamblado (builder) para componer el documento OpenAPI.

## Alternatives considered
1. **OpenAPI spec manual en YAML/JSON (spec-first)**
   - Pros: contrato totalmente separado, útil para APIs públicas estrictas.
   - Cons: alto riesgo de drift con Zod, duplicación y mantenimiento manual.

2. **Fastify schema por ruta (JSON Schema) escrito a mano**
   - Pros: integración directa con `@fastify/swagger`.
   - Cons: duplicación con Zod, coste de mantenimiento, documentación menos rica.

3. **Zod -> JSON Schema con `zod-to-json-schema` + Fastify swagger**
   - Pros: reduce duplicación en parte; enfoque sencillo.
   - Cons: metadata OpenAPI (examples/descriptions) limitada y menos expresiva; se termina complementando “a mano”.

4. **Decorators/framework-style (tsoa / NestJS decorators)**
   - Pros: experiencia integrada.
   - Cons: no alinea con arquitectura actual y añade acoplamiento innecesario.

## Consequences
### Positive
- Documentación Swagger más completa y consistente.
- Menos deuda técnica y menor probabilidad de romper el contrato sin reflejarlo en docs.
- Facilita el testing manual y la comunicación del contrato.

### Negative
- Se debe mantener un módulo de composición del OpenAPI (paths + components).
- Se deben definir convenciones para:
  - naming de schemas (ej. `LoginBody`, `RegisterBody`, `ErrorResponse`)
  - ubicación de ficheros (ej. `interfaces/http/**/schemas.ts`, `interfaces/http/openapi/*`)
  - estrategia de exposición (`/docs`, `/openapi.json`) y control por entorno

## Implementation notes
- Añadir `@asteasolutions/zod-to-openapi` y extender Zod con `extendZodWithOpenApi`.
- Definir schemas Zod en `interfaces/http/<feature>/schemas/*.ts`.
- Definir un builder `interfaces/http/openapi/document.ts` que:
  - registre `components.schemas`
  - registre `components.securitySchemes` (bearerAuth)
  - componga `paths` por feature
- Servir Swagger UI:
  - Exponer `/docs` y `/openapi.json` en `NODE_ENV !== 'production'` o tras auth/admin si aplica.
- (Opcional) Exportar `openapi.json` en CI o en un script `npm run docs:openapi` para versionado.
- Guardrail temporal:
  - Si una respuesta aún no está modelada en Zod, documentarla de forma acotada en `interfaces/http/openapi/*` con `TODO` y fecha objetivo de retirada para volver a fuente única.

## References
- OpenAPI 3.1 Specification
- Zod
- @asteasolutions/zod-to-openapi
- Fastify Swagger UI
