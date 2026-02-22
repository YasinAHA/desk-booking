# ADR-0008: Refresh Token in HttpOnly Cookie (Dual Migration)

## Status
Accepted

## Date
2026-02-22

## Scope
backend, frontend, auth, deployment

## Context
El flujo actual maneja refresh token en payload JSON, con persistencia en frontend, lo que aumenta superficie de riesgo frente a XSS.
Para un frontend web, el enfoque recomendado es mover el refresh token a cookie `HttpOnly` y dejar el access token en memoria con `silent refresh` al arrancar.
El cambio impacta backend, frontend y despliegue (CORS/cookies por entorno), por lo que se define una migracion controlada.

## Decision
- El refresh token se emitira y consumira mediante cookie `HttpOnly`.
- El frontend dejara de persistir refresh token en storage y usara `credentials: "include"` para auth.
- El access token se tratara como token de corta vida en memoria (con `silent refresh` en bootstrap).
- Se aplicara migracion en dos fases:
  1. **Dual mode temporal**: backend acepta `cookie || body` en `/auth/refresh` y `/auth/logout`.
  2. **Cookie-only**: se retira soporte legacy por body tras validacion.

## Cookie policy
- `httpOnly: true`
- `secure`: `true` en produccion; configurable para dev local sin HTTPS.
- `sameSite`:
  - `lax` para despliegue same-site (preferido para demo estable).
  - `none` + `secure=true` para cross-site en HTTPS real.
- `path`: `/auth`
- `maxAge`: alineado al TTL de refresh token.

## Consequences
### Positivas
- Reduce riesgo de robo de refresh token por XSS.
- Contrato de sesion web mas robusto y estandar para produccion.
- Mejor control de lifecycle de sesion en backend.

### Costes
- Mayor complejidad de bootstrap frontend (silent refresh).
- Requiere configuracion cuidadosa de CORS/credentials/cookies por entorno.
- Necesita estrategia de migracion para no romper clientes existentes.

## Migration policy
- Fase 1 (dual): habilitar cookie y mantener compatibilidad `body.token` temporal.
- Fase 2 (cierre): eliminar `body.token` de refresh/logout, actualizar OpenAPI y tests.
- La retirada del modo legacy debe quedar registrada en CHANGELOG y TASKS.
