# Backlog v0.6.0 (propuesto)

Objetivo: consolidar seguridad, roles y preparacion para uso interno tras el refactor de v0.5.0.

Nota: estas propuestas se moveran a `docs/TASKS.md` una vez tagueada y cerrada la v0.5.1.

## 1) Seguridad y sesiones
- [x] HTTP security headers (helmet) implementado en v0.5.0
- [x] JWT_REFRESH_SECRET required (sin defaults inseguros) implementado en v0.5.0
- [x] Password policy enforced (12+ chars, complexity, no patterns) implementado en v0.5.0
- [x] Docs/SECURITY.md (Security by Design/Default principles) implementado en v0.5.0
- [ ] Refresh token en cookie httpOnly (en lugar de localStorage).
- [ ] Revocacion de tokens en refresh endpoint (verificar token revocation).
- [ ] PII logging filter (emails no deben ir a logs en produccion).
- [ ] CSRF tokens para operaciones mutables (POST/DELETE).
- [ ] Duracion corta de access token + renovacion transparente (opcional).

## 2) Roles y permisos
- [ ] Modelo de roles (user/admin) y checks en backend.
- [ ] UI minima para admin (activar/desactivar desks, ver reservas).

## 3) Admin y auditoria
- [ ] Registro de acciones criticas (audit log basico).
- [ ] Export de reservas (CSV) para gestion interna.

## 4) Observabilidad y ops
- [ ] Logs con contexto de usuario (sin PII sensible).
- [ ] Metricas basicas (latencia y errores por ruta).

## 5) Producto y UX
- [ ] Vista mensual o semanal de ocupacion.
- [ ] Filtros en historial de reservas.

## 6) Deploy y CI/CD
- [ ] Pipeline de despliegue para entorno de correccion (manual o semiautomatico).
- [ ] Checklist de release (migraciones + seeds + smoke tests).

## 7) Docs
- [ ] Documento de roles y permisos.
- [ ] Guia de despliegue interno (borrador).

## 8) Arquitectura y modularidad (v0.6.x)
Prerrequisito:
- [ ] Cerrar y taguear v0.5.1 antes de iniciar cambios estructurales.

Plan incremental (sin big-bang):
- [ ] Definir ADR corta en `docs/DECISIONS.md` para modelo hibrido (capas + agrupacion por feature).
- [ ] Fase 1 (auth): reorganizar modulos de `application` e `infrastructure` por feature manteniendo contratos actuales.
- [ ] Fase 2 (reservations): misma estrategia, sin cambios funcionales.
- [ ] Fase 3 (desks): misma estrategia, sin cambios funcionales.
- [ ] Mantener `interfaces/http` como eje por feature y alinear nomenclatura/rutas de imports.
- [ ] Evitar movimientos transversales en una sola PR; una PR por feature con tests en verde.

Deuda tecnica previa (alta prioridad):
- [ ] Corregir flujo de refresh token para no emitir access token con payload parcial/vacio.
- [ ] Eliminar `any` en factories transaccionales de `auth.container`.
- [ ] Normalizar imports/extensiones inconsistentes.

Criterios de aceptacion:
- [ ] Sin imports ilegales entre capas (application no depende de infrastructure/interfaces).
- [ ] Sin regresiones funcionales en auth/reservations/desks.
- [ ] Tests backend pasando al 100% tras cada fase.
- [ ] Documentacion (AI-GUIDE/ARCHITECTURE/TASKS/CHANGELOG) actualizada al cierre.
