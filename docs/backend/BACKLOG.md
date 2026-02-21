# Backend Backlog (v0.8.x+)

Objetivo: registrar mejoras diferidas post-entrega para ejecutar después del hito `2026-02-23`.

Nota: este backlog no compite con `docs/backend/TASKS.md` mientras estemos en modo entrega.

## 1) Hardening de auth y sesiones (diferido)
- [ ] Session family para refresh rotation (detección real de reuse).
- [ ] Gestión de sesiones de usuario:
  - `GET /auth/sessions`
  - `DELETE /auth/sessions/:id`
  - `DELETE /auth/sessions` (logout global)
- [ ] Unificar políticas anti-abuso/rate limit para `login`, `refresh`, `forgot`, `reset`, `change-password`.
- [ ] PII logging filter (emails no deben ir a logs en producción).
- [ ] CSRF tokens para operaciones mutables (POST/DELETE) cuando aplique por canal cliente.

## 2) Operación y observabilidad
- [ ] Limpieza automática de `token_revocation` y `password_resets` expirados.
- [ ] Logs estructurados con correlation/request ID.
- [ ] Métricas básicas por ruta (latencia, errores) y eventos de seguridad trazables.

## 3) Contrato y robustez API
- [ ] Catálogo estable de códigos de error (sin dependencia de mensajes SQL).
- [ ] Endurecer respuestas y semántica de errores en flujos críticos de auth/reservas.

## 4) Roles, admin y auditoría
- [ ] Modelo de roles (user/admin) y checks en backend.
- [ ] Ajustar `POST /desks/admin/qr/regenerate-all` para multi-oficina/multi-org: regeneración por ámbito (`office_id`/`organization_id`) y permisos de admin por alcance.
- [ ] Reglas de ciclo de vida de QR en administración de escritorios: al cambiar atributos que afecten a la identidad operativa del puesto (por ejemplo, código/identificador visible), regenerar QR automáticamente en backend; mantener regeneración manual como opción y auditar ambos casos.
- [ ] Registro de acciones críticas (audit log básico).
- [ ] Export de reservas (CSV) para gestión interna.

## 5) Producto y UX
- [ ] Vista mensual o semanal de ocupación.
- [ ] Filtros en historial de reservas.
- [ ] Calendario de festivos.
- [ ] Endpoint de reservas multi-día (`/reservations/bulk`) diferido a post-entrega:
  - No implementar antes del hito `2026-02-23` por riesgo de colisiones y regresiones en flujo crítico.
  - Diseño objetivo cuando se retome:
    - entrada por fechas explícitas (no rangos abiertos),
    - límite de items por petición,
    - resultado parcial por fecha (sin all-or-nothing),
    - controles anti-acaparamiento (límite semanal por usuario).

## 6) Deploy y CI/CD
- [ ] Pipeline de despliegue para entorno de corrección (manual o semiautomático).
- [ ] Checklist de release (migraciones + seeds + smoke tests).

## 7) Documentación
- [ ] Documento de roles y permisos.
- [ ] Guía de despliegue interno (borrador).
