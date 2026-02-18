# ADR-0001: Foundational Stack and Governance

- Status: Accepted
- Date: 2026-02-07
- Scope: core

## Context
Al inicio del proyecto se necesitaba fijar una base técnica y de gobierno para asegurar trazabilidad, coherencia y evolución controlada.

## Decision
- Backend propio en Fastify + TypeScript.
- PostgreSQL local vía Docker para entorno reproducible.
- Monorepo (`backend` + `frontend`) con versionado coordinado.
- Autenticación con JWT.
- SemVer + changelog como politica de versionado.
- Documentar tags en README/changelog para contexto histórico.

## Consequences
- Mayor control de arquitectura y operación.
- Menor dependencia de plataformas externas para el core.
- Mejor trazabilidad de releases y decisiones.


