# ADR-0003: v0.6 Architecture - Layer-First with Feature Grouping

- Status: Accepted
- Date: 2026-02-17
- Scope: backend

## Context
Se necesita mejorar mantenibilidad y modularidad sin romper Clean Architecture ni introducir un big-bang refactor.

## Decision
- Mantener enfoque layer-first (`domain`, `application`, `infrastructure`, `interfaces`).
- Agrupar por feature dentro de cada capa.
- Mover composition root fuera de `interfaces/http`.
- Aplicar CQRS en `application`:
  - Completo para `auth` y `reservations`.
  - Parcial para `desks` en v0.6 (ampliar solo si aparece complejidad real).
- Permitir transición `usecases` -> `handlers` durante el refactor.

## Consequences
- Mejor aislamiento por responsabilidad sin perder direccion de dependencias.
- Refactor incremental por fases (auth -> reservations -> desks).
- Menor riesgo operativo frente a una migración estructural completa.

