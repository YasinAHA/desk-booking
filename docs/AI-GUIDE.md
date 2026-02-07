# AI Guide

Este documento define el flujo esperado cuando se use IA en este repo.

## Objetivo
- Mantener coherencia con el TFM y la arquitectura actual.
- Evitar desviaciones (p.ej. volver a Supabase).

## Fuentes de verdad
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/SCOPE.md](docs/SCOPE.md)
- [docs/DECISIONS.md](docs/DECISIONS.md)
- [docs/TASKS.md](docs/TASKS.md)
- [CHANGELOG.md](../CHANGELOG.md)

## Reglas basicas
- No reintroducir Supabase ni BaaS.
- No inventar endpoints: si no existen, marcarlos como planned.
- No tocar el esquema de DB sin actualizar `docker/postgres/init/001_init.sql` y docs.
- Mantener monorepo (backend + frontend).
- Cambios de arquitectura requieren una decision en `docs/DECISIONS.md`.

## Flujo de trabajo recomendado
1) Revisar `docs/*` antes de proponer cambios.
2) Implementar primero backend y contratos API.
3) Actualizar docs y changelog si hay cambios relevantes.
4) Mantener separacion por modulos (`modules/*`).

## Estilo de codigo
- TypeScript estricto en backend.
- Preferir servicios puros y rutas delgadas.
- Validacion de entrada con Zod.

## Entornos
- Local: Postgres via Docker.
- Variables: `backend/.env` basado en `backend/.env.example`.
