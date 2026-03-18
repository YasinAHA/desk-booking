# Plan de Implementación - Desk Booking v1 (Simplificación Camerfirma)

**Fecha:** 2026-03-18  
**Versión:** 1.0.0  
**Prefijo API:** `/api/internal/desk-booking/v1`  
**Escenario:** Simplificación SaaS → Single-tenant internal para Camerfirma

---

## 0. Estado actual (2026-03-18)

### 0.1 OpenAPI / contratos
- [x] Prefijo v1 adoptado: `/api/internal/desk-booking/v1`
- [x] OpenAPI regenerado desde backend (`docs/openapi.json`)
- [x] Contrato con `POST /reservations/{id}/check-in` actualizado

### 0.2 Backend/DB ya ejecutado
- [x] Migración de simplificación aplicada y estabilizada (`008_internal_simplification.sql`)
- [x] Seed de simplificación aplicado (`db:seed -- simplificacion`)
- [x] Refactor principal de reservas a `starts_at`/`ends_at`
- [x] Validación de suite backend (`lint`, `lint:types`, `test`, `test:e2e:temporal`)

---

## 1. Fases de Implementación

### Fase 1: Preparación de Base de Datos (Migración)
**Duración estimada:** 2-3 días  
**Responsable:** Backend / DBA  

#### 1.1 Pre-requisitos
- [ ] Backup de producción actual completado
- [ ] Ambiente de testing aislado preparado
- [x] Scripts de migración validados (008_internal_simplification.sql)

#### 1.2 Pasos de Migración
1. Aplicar migración `008_internal_simplification.sql` en testing
   - Crear tabla `user_preferences`
   - Crear tabla `app_settings` con configuración global
   - Crear tabla `allowed_email_domains`
   - Alterar `reservations` → agregar columnas `starts_at`, `ends_at`, `checkin_deadline_at`
   - Alternar `zeros`, `desks` → eliminar `floor_id`, agregar campos de layout
   - Aplicar hardening en `desk_blocks` (constraints de exclusión)

2. Aplicar seed `simplificacion`
   - Crear organización "Camerfirma"
   - Crear oficina "Camerfirma HQ"
   - Crear 3 zonas (A, B, C)
   - Crear 15 desks de ejemplo
   - Poblar `user_preferences` para usuarios existentes
   - Configurar `app_settings` (registro cerrado por defecto)

3. Validaciones post-migración
   ```sql
   -- Verificar integridad de datos
   SELECT COUNT(*) FROM app_settings WHERE scope_type = 'global';
   SELECT COUNT(*) FROM desks WHERE office_id IS NULL; -- debe ser 0
   SELECT COUNT(*) FROM reservations WHERE starts_at IS NULL; -- debe ser 0
   SELECT COUNT(*) FROM desk_blocks WHERE start_at > end_at; -- debe ser 0
   ```

4. Migrar a producción (ventana de mantenimiento)

### Fase 2: Backend - Adaptación de Controladores (4-6 días)
**Responsable:** Backend  

#### 2.1 Autenticación & Autorización
- [ ] Endpoint `POST /auth/register` → validar contra `allowed_email_domains`
- [ ] Endpoint `POST /auth/login` → mantener sin cambios
- [x] Rol/permission check: usuario normal vs admin
- [ ] Soft-delete deprecation: migrar a `status` en lugar de `deleted_at`

#### 2.2 Desks & Layout
- [x] `GET /admin/desks` → agregar filtros por zona/estado
- [x] `PATCH /admin/desks/{id}/layout` → guardar `layout_x`, `layout_y`, `layout_w`, `layout_h`, `rotation_deg`
- [ ] `GET /desks` (usuario) → retornar datos de layout para plano

#### 2.3 Reservations
- [x] Refactorizar modelo: `reservation_date` → `starts_at`, `ends_at`
- [ ] Validación de solapamientos con constraint de exclusión (PostgreSQL)
- [ ] `POST /reservations` (usuario) → crear reservas por rango
- [x] `POST /admin/reservations` → soportar tipo `guest` con `guest_name`, `guest_email`, `guest_company`, `host_user_id`
- [x] `PATCH /admin/reservations/{id}` → cambio de status
- [x] Estados: `reserved`, `checked_in`, `cancelled`, `no_show`

#### 2.4 Check-in
- [x] Nuevo endpoint: `POST /reservations/{id}/check-in`
  - Validar status = `reserved`
  - Validar ventana de checkin (defaults: `starts_at ± 15 min`)
  - Marcar `checked_in_at = now()`
  - Cambiar status → `checked_in`
  
- [x] Mantener deprecated: `POST /reservations/check-in/qr`
  - Buscar reservación activa por `qr_public_id`
  - Delegar a nuevo endpoint

#### 2.5 Settings & Configuración
- [x] Cargar `app_settings` en startup (cache en memoria)
- [x] Endpoints `GET/PATCH /admin/settings`
- [ ] Valores por defecto:
  - `allow_self_registration = false`
  - `guest_mode_enabled = true`
  - `checkin_window_minutes = 15`
  - `max_advance_days = 7`
  - `max_reservations_per_user = 1`

#### 2.6 User Preferences
- [ ] Crear endpoint `GET /me/preferences`
- [ ] Crear endpoint `PATCH /me/preferences` (theme, language, timezone)
- [ ] Insertar automáticamente para nuevos usuarios

#### 2.7 Auditoría
- [ ] Registrar eventos clave en `audit_events`
  - `reservation_created`, `reservation_cancelled`, `reservation_checked_in`, `reservation_no_show`
  - `desk_status_changed`, `desk_block_created`, `admin_action`
- [ ] Incluir `actor_user_id`, `actor_type` (admin/user/system)

### Fase 3: Reportes / BI (2-3 días, en paralelo con Fase 2)
**Responsable:** Backend  

#### 3.1 Endpoints de Reportes
- [x] `GET /admin/reports/occupancy?start=YYYY-MM-DD&end=YYYY-MM-DD`
  - Query sobre reservations + desks
  - Retornar: `desk_id`, `zone_name`, `total_slots`, `occupied_slots`, `occupancy_rate`

- [x] `GET /admin/reports/cancellations?start=YYYY-MM-DD&end=YYYY-MM-DD&period=day|week|month`
  - Agrupar por usuario, fecha de cancelación
  - Incluir `avg_cancellation_lead_time`

- [x] `GET /admin/reports/no-shows?start=YYYY-MM-DD&end=YYYY-MM-DD`
  - Contar por usuario, filtrar status = `no_show`
  - Calcular `incidence_rate` (%)

- [x] `GET /admin/reports/audit-log?start=YYYY-MM-DD&end=YYYY-MM-DD&actor_id=uuid`
  - Retornar respuesta filtrada de `audit_events` (compliance)

- [x] `GET /admin/reports/summary?period=today|this_week|this_month`
  - Dashboard rápido

#### 3.2 Exportación CSV
- [x] Implementar helper para convertir reportes a CSV
- [x] Agregar header `Content-Disposition: attachment; filename=report-XXX.csv`

### Fase 4: Frontend - Lovable Adaptación (4-6 días)
**Responsable:** Frontend/Lovable  

#### 4.1 Componentes Generales
- [ ] Actualizar `Login` → validar mensaje si dominio no permitido
- [ ] Actualizar `Register` → validar dominio corporativo
- [ ] Dashboard → componerse desde resúmenes de reportes

#### 4.2 User Interface
- [ ] Floor Map → cargar datos de layout (`layout_x`, `layout_y`, etc.)
- [ ] My Bookings → filtrar por status, soportar rangos de fecha
- [ ] Check-In → integración con nuevo endpoint `/reservations/{id}/check-in`
- [ ] Profile → pantalla de preferencias (theme, idioma, timezone)

#### 4.3 Admin Panel
- [ ] Users tab → mantener sin cambios
- [ ] Desks tab → drag & drop persistente via `PATCH /admin/desks/{id}/layout`
- [ ] Bookings tab → crear reservas tipo `internal` e `guest`
- [ ] Floor Plan → editor visual con persistencia
- [ ] QR Codes tab → listar QRs (nuevos endpoints `/admin/desks/qr`, `/admin/desks/qr/regenerate-bulk`)
- [ ] Reports → tabs/módulo con gráficas de ocupación, cancelaciones, no-shows
- [ ] Settings → interfaz para editar `app_settings`

#### 4.4 Integración de Reportes
- [ ] Agregar tab "Reports" en admin
- [ ] Gráficas de tendencias (Chart.js, Recharts, etc.)
- [ ] Filtros por fecha, oficina, zona
- [ ] Botón "Export CSV" para cada reporte

### Fase 5: Testing & QA (2-3 días)
**Responsable:** QA / Testing  

#### 5.1 Pruebas Unitarias
- [ ] Auth module (login, register, dominio)
- [ ] Reservations (rango, overlaps, status transitions)
- [ ] Settings (valores por defecto, carga)

#### 5.2 Pruebas de Integración
- [ ] Flujo completo check-in: reservar → check-in → validar status
- [ ] Creación de invitados: admin creates guest reservation
- [ ] Reportes: generar datos de prueba, validar agregaciones

#### 5.3 Pruebas E2E
- [ ] Scenario: usuario interno registra, reserva, hace check-in
- [ ] Scenario: admin crea invitado, verifica en dashboard
- [ ] Scenario: admin genera reporte de ocupación

#### 5.4 Smoke Tests en Producción
- [ ] Health check API
- [ ] Queries críticas en DB (performance)
- [ ] Log review (errores, warnings)

### Fase 6: Deployment & Go-Live (1 día)
**Responsable:** DevOps / Backend Lead  

#### 6.1 Pre-Deployment
- [ ] Comunicar a stakeholders (RRHH, IT, admin)
- [ ] Backup y plan de rollback
- [ ] Feature flags: deshabilitar v0 routes, habilitar v1

#### 6.2 Deployment
1. **Ventana de mantenimiento** (off-peak)
   - 1. Aplicar migraciones DB en prod
   - 2. Deploy backend (nuevo código)
   - 3. Deploy frontend (Lovable)
   - 4. Validaciones post-deploy (health check, queries)

2. **Validaciones post-go-live**
   - Smoke tests automatizados
   - Monitoreo de errores (Sentry, logs)
   - Performance checks (response times, DB load)

#### 6.3 Post-Deployment
- [ ] Monitoreo 24h después
- [ ] Feedback de usuarios (IT, admins)
- [ ] Documentación de cabecera para soporte
- [ ] Plan de comunicación (si hay incidentes)

---

## 2. Dependencias Técnicas

### Tecnologías Requeridas
- PostgreSQL 13+ (extensiones: `btree_gist`, `citext`)
- Node.js 18+ (backend)
- React 18+ (frontend)
- TypeScript
- Zod (validación de schemas)
- Lovable (frontend builder)

### Librerías Backend
- `express` o equivalente
- `pg` (PostgreSQL client)
- `jsonwebtoken` (JWT)
- `bcrypt` (password hashing)
- `dotenv`

### Librerías Frontend
- `react-query` o `tanstack/query`
- `axios`
- `react-hook-form` (forms)
- `chart.js` o `recharts` (reportes)
- `zustand` o Redux (state)
- `date-fns` o `dayjs` (dates)

---

## 3. Riesgos & Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|--------|-----------|
| Pérdida de datos en migración | Media | Crítico | Backup completo, testing en staging, plan de rollback |
| Constraint de exclusión en overlaps falla | Baja | Alto | Pruebas unitarias de constraint, validación pre-insert en app |
| Performance degradado con reportes | Media | Medio | Índices en `reservations`, queries optimizadas, caché |
| Usuarios con dominio viejo no pueden registrar | Media | Medio | Comunicación previa, ventana de migración, admin puede crear usuarios |
| Invitados sin email válido rompen flujos | Baja | Bajo | Validación Zod de email, test de edge cases |

---

## 4. Checklist de Go-Live

### Pre-Go-Live (T-48h)
- [ ] Todas las pruebas E2E pasando
- [ ] Performance baselines establecidas
- [ ] Rollback plan documentado y testado
- [ ] Team de soporte capacitado
- [ ] Comunicación enviada a usuarios finales

### Go-Live Day
- [ ] Mantenimiento programado confirmado
- [ ] Backup de producción completado
- [ ] Migraciones DB aplicadas
- [ ] Backend y frontend deployados
- [ ] Smoke tests ejecutados
- [ ] Team de on-call disponible

### Post-Go-Live (T+24h)
- [ ] Monitoreo contínuo de logs, métricas
- [ ] Validar creación de reservas, check-ins
- [ ] Verificar reportes generan datos correctamente
- [ ] Feedback de usuarios recopilado

---

## 5. Cronograma Estimado

| Fase | Duración | Inicio est. | Fin est. |
|------|----------|-------------|----------|
| 1. Migración DB | 2-3 días | Mar 19 | Mar 21 |
| 2. Backend | 4-6 días | Mar 22 | Mar 27 |
| 3. Reportes | 2-3 días | Mar 26 | Mar 28 |
| 4. Frontend | 4-6 días | Mar 22 | Mar 27 |
| 5. QA | 2-3 días | Mar 28 | Mar 30 |
| 6. Deployment | 1 día | Mar 31 | Mar 31 |
| **Total** | **13-16 días** | **Mar 19** | **Mar 31** |

---

## 6. Success Criteria

✅ **v1 será exitosa cuando:**
1. Todos los endpoints funcionan sin errores 5xx
2. Reportes generan datos correcto dentro de 2 segundos
3. Usuarios internos pueden registrarse/reservar sin fricciones
4. Admin puede crear invitados sin restricción
5. Check-in funciona en < 500ms
6. No hay pérdida de datos históricos de reservas
7. Cobertura de tests ≥ 80%
8. Uptime ≥ 99% en primeras 48h

---

## Contactos de Escalación

| Rol | Nombre | Contacto | Disponibilidad |
|-----|--------|----------|-----------------|
| Backend Lead | TBD | TBD | 24/7 |
| Frontend Lead | TBD | TBD | 24/7 |
| DBA | TBD | TBD | Durante migración |
| DevOps | TBD | TBD | Go-live |

---

**Versión:** 1.0  
**Última actualización:** 2026-03-18  
**Próxima revisión:** Después Fase 2 completada
