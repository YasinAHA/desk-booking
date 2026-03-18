# Desk Booking – Simplificación de arquitectura para Camerfirma interno

**Fecha:** 2026-03-18  
**Ámbito:** refactor de modelo de datos, contratos API y reglas funcionales para adaptar el backend actual a un despliegue **interno** en Camerfirma, manteniendo un panel admin potente y dejando preparada una evolución futura sin sobreingeniería innecesaria.

---

## 1. Objetivo de esta simplificación

El backend actual nace con una orientación relativamente genérica, cercana a un producto SaaS/multi-tenant, con elementos como:

- `organizations`
- `offices`
- `floors`
- `zones`
- `reservation_policies`
- `desk_blocks`
- `audit_events`
- registro/login propio
- QR check-in
- endpoints admin específicos
- restricciones actuales por día en reservas

Para el caso **Camerfirma interno**, el objetivo no es convertirlo en algo trivial, sino **quitar complejidad donde hoy no aporta valor** y **conservar lo que sí es útil para el panel admin y para cambios futuros de oficina/layout**.

---

## 2. Principios de decisión

1. **Single-tenant funcional, no multi-tenant operativo**
   - El sistema se explotará internamente para Camerfirma.
   - No se eliminará toda la base multi-tenant si no molesta, pero tampoco se expondrá como capacidad de producto.

2. **El admin importa**
   - Como el panel admin en frontend será potente, se mantendrán las entidades que aportan valor real a:
     - gestión de oficinas
     - zonas
     - escritorios
     - layout/plano editable
     - bloqueos de escritorios
     - settings administrables

3. **Persistencia real del layout**
   - El drag & drop del plano no debe quedarse solo en frontend.
   - El backend debe persistir posición y metadatos mínimos de layout.

4. **Reservas preparadas para rango**
   - Se abandona el enfoque “solo un día” como modelo central.
   - Se recomienda adoptar reservas con `starts_at` / `ends_at` y soporte de rangos de PostgreSQL.

5. **Check-in simple y robusto**
   - Se abandona la lógica de ventana global fija por hora (`checkin_allowed_from`, `checkin_cutoff_time`) como eje principal.
   - El check-in debe depender de la propia reserva: ventana relativa configurable.

6. **Configuración separada por responsabilidad**
   - Configuración global del sistema y de negocio: tabla administrable por admin.
   - Preferencias del usuario: tabla separada.
   - Secretos técnicos: `.env`.

---

## 3. Decisiones por bloque

## 3.1. Organización / tenancy

### Decisión
**Mantener `organizations`, pero congelada funcionalmente.**

### Justificación
- Ya existe en el modelo actual.
- No molesta mantenerla.
- Evita rehacer más de la cuenta.
- Permite una futura evolución si alguna vez se necesitara.

### Regla práctica
- Solo existirá una organización activa: **Camerfirma**.
- No se expondrá CRUD de organizaciones en la v1 interna.
- El frontend no debe trabajar con conceptos multi-tenant.

### Conclusión
`organizations` se mantiene en BBDD, pero **no será un eje funcional del producto**.

---

## 3.2. Oficinas

### Decisión
**Mantener `offices`.**

### Justificación
Es una entidad necesaria para:
- cambios futuros de oficina
- coexistencia temporal de oficinas
- reporting
- layout/plano por oficina
- configuración por oficina si hiciera falta

### Regla práctica
- Una reserva sigue asociándose a una oficina.
- Los escritorios siguen perteneciendo a una oficina.
- Si una oficina deja de usarse, se **desactiva o archiva**, no se borra duro.

---

## 3.3. Plantas (`floors`)

### Decisión
**Eliminar o aparcar `floors` en la v1 simplificada.**

### Justificación
- Añade complejidad sin aportar valor claro ahora mismo.
- El panel admin puede funcionar perfectamente con:
  - oficina
  - zona
  - escritorio
  - layout

### Regla práctica
- Si en el futuro hay una necesidad real de modelar varias plantas, podrá reintroducirse.
- En la v1 no se considera parte del modelo funcional principal.

---

## 3.4. Zonas

### Decisión
**Mantener `zones`.**

### Justificación
Las zonas sí aportan valor real:
- agrupación visual
- filtros en admin
- nomenclatura de espacios
- reorganización futura
- mejor UX tanto en admin como en usuario

### Recomendación
Ampliar `zones` con campos opcionales como:
- `color`
- `display_order`

---

## 3.5. Escritorios

### Decisión
**Mantener `desks` y ampliar su capacidad de layout.**

### Justificación
El escritorio sigue siendo el recurso principal reservable y, además, el admin necesita personalizar:
- posición
- nombre
- zona
- estado
- QR
- bloqueos

### Recomendación de ampliación
Añadir persistencia de layout:
- `layout_x`
- `layout_y`
- `layout_w`
- `layout_h`
- `rotation_deg`

Campos opcionales adicionales:
- `shape` o `desk_type`
- `capacity` si algún día hubiera puestos especiales

### Regla práctica
- El layout se persiste en backend.
- El plano no se deja hardcodeado solo en frontend.

---

## 3.6. Layout / plano editable

### Decisión
**El layout pasa a ser parte explícita del dominio admin.**

### Justificación
Como el panel admin ya contempla drag & drop, el backend debe soportarlo de forma real.

### Recomendación mínima
Persistir en backend:
- coordenadas del escritorio
- dimensiones básicas
- rotación
- opcionalmente metadatos de canvas por oficina

### Recomendación en `offices`
Añadir campos como:
- `floorplan_image_url` o referencia al recurso gráfico
- `canvas_width`
- `canvas_height`

---

## 3.7. Reserva: rediseño a rango

### Decisión
**Rediseñar `reservations` para pasar de reserva por día a reserva por rango.**

### Modelo actual a abandonar como eje
- `reservation_date`

### Modelo recomendado
- `starts_at timestamptz not null`
- `ends_at timestamptz not null`

### Recomendación PostgreSQL
Añadir o derivar:
- `slot tstzrange`

### Justificación
Esto permite:
- reservas por horas
- media jornada
- futura ampliación sin rehacer modelo
- validación robusta de solapamientos

### Restricción recomendada
Impedir solapamientos activos para el mismo escritorio usando una exclusión sobre rango y `desk_id` (con estados activos).

### Nota
Acoplarse a PostgreSQL aquí **sí se considera una decisión aceptable y beneficiosa**.

---

## 3.8. Tipos de reserva

### Decisión
**Introducir tipos de reserva formales.**

### Propuesta
`reservation_type`:
- `internal`
- `guest`

### Justificación
El sistema debe permitir invitados controlados por admin sin mezclar eso con el registro normal.

### Reglas
- `internal`:
  - `user_id` obligatorio
- `guest`:
  - `host_user_id` obligatorio
  - datos del invitado obligatorios

### Campos recomendados
- `reservation_type`
- `host_user_id`
- `guest_name`
- `guest_email`
- `guest_company`
- `notes`

---

## 3.9. Invitados

### Decisión
**Los invitados no se registran por sí solos.**

### Regla funcional
- Solo un admin puede crear reservas de tipo invitado.
- El registro self-service queda restringido al dominio corporativo.

### Justificación
Esto mantiene el sistema interno cerrado y permite casos excepcionales bien gobernados.

### Modelo funcional v1
En v1, el invitado se modela como una reserva especial sin cuenta:
- `reservation_type = 'guest'`
- sin login ni registro para invitado
- creación/edición restringida a admin
- `host_user_id` opcional/recomendado como responsable interno

Datos mínimos recomendados para invitado:
- `guest_name`
- `guest_email`
- `guest_company`
- `host_user_id` (si aplica)

---

## 3.10. Check-in

### Decisión
**Simplificar el check-in para que dependa de la reserva, no de una franja horaria global.**

### Modelo recomendado
Añadir o mantener:
- `checkin_deadline_at`
- `checked_in_at`
- `cancelled_at`
- `no_show_at`

### Regla funcional
- La ventana de check-in se calcula a partir de la reserva:
  - ejemplo: `starts_at + 15 minutos`
  - o `starts_at + 30 minutos`
- El valor será configurable por admin.

### Justificación
Es más simple y más coherente con la operación real que usar ventanas globales fijas por hora del día.

### QR
El QR puede seguir existiendo como validación del escritorio, pero **no debe ser el centro del modelo**.

---

## 3.11. Policies / settings

### Decisión
**Transformar `reservation_policies` en una configuración administrable más simple y explícita.**

### Problema actual
La tabla mezcla:
- límites
- reglas de dominio
- horas globales de check-in
- reglas de cancelación

### Nuevo enfoque
Crear una tabla tipo `app_settings` o `office_settings` (según el nivel deseado) con parámetros como:

- `allow_self_registration`
- `allowed_email_domains`
- `guest_mode_enabled`
- `checkin_window_minutes`
- `max_advance_days`
- `max_reservations_per_user`
- `cancellation_deadline_minutes`
- `default_reservation_duration_minutes`
- `business_hours_start`
- `business_hours_end`

### Reglas de responsabilidad
- `.env`: secretos y configuración técnica
- tabla settings: reglas de negocio administrables
- `user_preferences`: preferencias personales

---

## 3.12. Preferencias de usuario

### Decisión
**Separar preferencias de usuario de la tabla `users`.**

### Tabla recomendada
`user_preferences`

### Campos recomendados
- `user_id`
- `theme` (`light`, `dark`, `system`)
- `language` (`es`, `en`)
- `timezone`
- `email_notifications_enabled`
- `updated_at`

### Justificación
Evita convertir `users` en un cajón de sastre y separa:
- identidad/autorización
- preferencias personales
- configuración global

### Qué NO va aquí
No meter:
- límites de reserva
- dominio permitido
- reglas de negocio del sistema

---

## 3.13. Usuarios y auth

### Decisión
**Mantener auth propia por ahora.**

### Registro
Se mantiene `register`, pero restringido a dominios corporativos permitidos.

Regla de arranque recomendada para entorno interno:
- `allow_self_registration = false` por defecto.
- Solo se habilita temporalmente si RRHH/IT lo necesita para onboarding controlado.

Política v1 de acceso:
- usuario interno autenticado (dominio corporativo permitido)
- invitado sin cuenta gestionado por admin
- usuario externo autenticado: fuera de alcance de v1

### Invitados
No usan el flujo normal de registro.

### Outlook / Microsoft login
No se incorpora ahora.
Se considera una posible evolución futura, pero no se adopta en esta simplificación porque:
- no reduce el trabajo principal del producto
- añade complejidad de integración
- no sustituye la autorización interna

### Recomendación práctica
Mantener:
- login
- register
- refresh
- logout
- me
- forgot/reset password

Revisar si realmente hace falta:
- confirm email
- verify email

---

## 3.14. Desk blocks

### Decisión
**Mantener `desk_blocks`.**

### Justificación
Aporta valor real al admin:
- mantenimiento
- indisponibilidad temporal
- incidencias
- bloqueos operativos

### Enfoque
No se convierte en eje principal del producto, pero sí en un módulo admin útil.

### Hardening técnico recomendado
Para evitar inconsistencias operativas en producción:
- constraint `chk_desk_blocks_end_after_start` (`end_at > start_at`)
- constraint de exclusión `ex_desk_blocks_no_overlap` por `desk_id` + rango temporal

---

## 3.15. Auditoría

### Decisión
**Mantener `audit_events`.**

### Justificación
Aporta trazabilidad valiosa para un entorno interno y para el panel admin.

### Enfoque
Registrar solo eventos de negocio relevantes:
- `reservation_created`
- `reservation_cancelled`
- `reservation_checked_in`
- `reservation_no_show`
- `desk_status_changed`
- `desk_block_created`
- `desk_block_ended`
- `user_status_changed`
- `admin_action`

---

## 4. Modelo objetivo resumido

## 4.1. Mantener
- `organizations` (congelada funcionalmente)
- `offices`
- `zones`
- `desks`
- `reservations`
- `desk_blocks`
- `audit_events`
- `email_outbox`
- `password_resets`
- `token_valid_after`
- `token_revocation`

## 4.2. Eliminar o aparcar
- `floors`

## 4.3. Transformar
- `reservation_policies` → `app_settings` / `office_settings`
- `reservations` → soporte por rango
- check-in → relativo a la reserva

## 4.4. Añadir
- `user_preferences`
- campos de layout en `desks`
- posible configuración visual/canvas en `offices`
- soporte formal de invitados en `reservations`

---

## 5. Propuesta de `reservations` objetivo

Campos recomendados:

- `id`
- `reservation_type`
- `user_id`
- `host_user_id`
- `desk_id`
- `office_id`
- `starts_at`
- `ends_at`
- `status`
- `checkin_deadline_at`
- `checked_in_at`
- `cancelled_at`
- `no_show_at`
- `created_by`
- `source`
- `guest_name`
- `guest_email`
- `guest_company`
- `notes`
- `created_at`
- `updated_at`

### Status propuestos
- `reserved`
- `checked_in`
- `cancelled`
- `no_show`

### Source propuestos
- `user`
- `admin`
- `walk_in`
- `system`

---

## 6. OpenAPI / contratos

## 6.1. Prefijo recomendado
`/api/internal/desk-booking/v1`

### Decisión semántica
Se adopta este prefijo como estándar de v1 porque equilibra:
- contexto interno explícito (`internal`)
- contexto de producto (`desk-booking`)
- versionado limpio (`v1`)

### Alternativas consideradas
- `/api/v1`: demasiado genérico para este escenario
- `/api/camerfirma/desk-booking/v1`: acopla la URL al nombre de la empresa
- `/api/desk-booking/v1`: válido, pero menos explícito sobre el carácter interno

### Regla de evolución
Si más adelante la API se abre a un contexto no interno o más genérico, se podrá publicar una nueva familia de rutas (por ejemplo sin `internal`) manteniendo compatibilidad por versión durante la transición.

## 6.2. Mantener en auth
- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`

## 6.3. Reorganización recomendada
### Usuario
- `GET /desks`
- `POST /reservations`
- `GET /reservations/me`
- `DELETE /reservations/{id}`
- `POST /reservations/{id}/check-in`
- `GET /me/preferences`
- `PATCH /me/preferences`

### Admin
- `GET /admin/desks`
- `POST /admin/desks`
- `PATCH /admin/desks/{id}`
- `PATCH /admin/desks/{id}/layout`
- `POST /admin/desks/{id}/qr/regenerate`
- `GET /admin/reservations`
- `POST /admin/reservations`
- `PATCH /admin/reservations/{id}`
- `GET /admin/settings`
- `PATCH /admin/settings`
- `GET /admin/zones`
- `POST /admin/zones`
- `PATCH /admin/zones/{id}`
- `GET /admin/desk-blocks`
- `POST /admin/desk-blocks`
- `PATCH /admin/desk-blocks/{id}`
- `GET /admin/users`
- `PATCH /admin/users/{id}`

### Admin Reporting
- `GET /admin/reports/occupancy`
- `GET /admin/reports/cancellations`
- `GET /admin/reports/no-shows`
- `GET /admin/reports/audit-log`
- `GET /admin/reports/summary`

## 6.4. Cobertura de frontend (Lovable)

### Tabs de Admin (captura)
- `Users` → cubierto por `GET /admin/users`, `PATCH /admin/users/{id}`
- `Desks` → cubierto por `GET/POST/PATCH /admin/desks`
- `Bookings` → cubierto por `GET/POST/PATCH /admin/reservations`
- `Floor Plan` → cubierto por `PATCH /admin/desks/{id}/layout` + modelo layout persistente
- `QR Codes` → **parcialmente cubierto** por `POST /admin/desks/{id}/qr/regenerate`

Gap recomendado para cerrar `QR Codes` como módulo admin completo:
- `GET /admin/desks/qr` (listado con `deskId`, `deskCode`, `qrPublicId`, estado)
- `POST /admin/desks/qr/regenerate-bulk` (rotación masiva opcional)

### Sidebar de app (captura)
- `Dashboard` → no requiere endpoint propio obligatorio en v1; puede componerse desde reservas/ocupación
- `Floor Map` → cubierto por `GET /desks` (incluyendo datos de layout)
- `My Bookings` → cubierto por `GET /reservations/me`
- `Check-In` → cubierto por `POST /reservations/{id}/check-in`
- `Profile`/`Settings` (usuario) → cubierto por `GET/PATCH /me/preferences`
- `Admin` (entrada a módulo) → cubierto por rutas `/admin/*`

## 6.5. Endpoint de check-in
### Decisión
Eliminar como contrato principal el enfoque:
- `POST /reservations/check-in/qr`

### Nuevo enfoque
- `POST /reservations/{id}/check-in`
- cuerpo opcional con `qrPublicId` para validación adicional

### Motivo del cambio
El check-in es una transición de estado de una reserva concreta. Pasar por `reservationId` aporta:
- trazabilidad y auditoría claras por reserva
- validación robusta de ownership/permiso/estado
- menos ambigüedad cuando hay varias reservas posibles en la misma franja
- menor acoplamiento del contrato al mecanismo de lectura QR

### Compatibilidad transitoria recomendada
Mantener durante transición (deprecado):
- `POST /reservations/check-in/qr` (resuelve `reservationId` activo + delega internamente)

Retirada sugerida:
- cuando frontend y operaciones estén migrados y sin uso en logs durante al menos 2 ciclos.

---

## 7. Reglas de configuración

## 7.1. `.env`
Dejar solo:
- secretos JWT
- SMTP
- URLs
- flags técnicos
- defaults de arranque

## 7.2. Settings admin
Mover a tabla:
- dominio permitido
- ventana de check-in
- límites de reserva
- reglas de cancelación
- modo invitados
- horarios operativos

Baseline recomendado para Camerfirma interno:
- `allow_self_registration = false`

Semántica operativa recomendada:
- `allowed_email_domains`: dominios internos autorizados para registro/login corporativo
- `guest_mode_enabled`: habilita reservas de invitado sin cuenta
- `trusted_external_domains`: reservado para futura evolución (no operativo en v1)

## 7.4. Evolución futura de acceso externo

Queda aplazada para una versión posterior la incorporación de dominios externos confiables (`trusted_external_domains` o equivalente) para acceso autenticado controlado.

Regla explícita:
- un dominio externo confiable no dará acceso automático por sí mismo.
- su uso requerirá reglas adicionales (política de negocio, posible aprobación admin y controles de autorización).

## 7.5. Preferencias personales
Mover a `user_preferences`:
- tema
- idioma
- timezone
- notificaciones personales

---

## 8. BI / Reporting para Admin

### Decisión
**Incluir módulo de reportes fundamentales en v1 para operación y control.**

### Justificación
El admin necesita visibilidad operativa clara; reportes básicos no añaden complejidad backend significativa si se estructuran como queries simples sobre auditoría y estado.

### Reportes recomendados para v1

#### 8.1. Asistencia / Ocupación por período
Permite evaluar uso real de espacios y ocupación.

Consulta recomendada:
- período (fecha inicio / fin)
- zona/oficina
- métrica: desks reservados vs disponibles, tasa ocupación

Datos a exponer:
- `desk_id`, `desk_code`, `zone_name`
- `total_slots` (rangos diarios)
- `occupied_slots` (reservas activas)
- `occupancy_rate` (%)

#### 8.2. Cancelaciones
Identifica patrones de cancelación por usuario/período.

Datos clave:
- `user_id`, `user_email`
- `cancelled_at`
- `cancellation_reason` (si fue registrada)
- `count_per_user`
- `avg_cancellation_lead_time`

#### 8.3. No-shows
Registra casos de reserva sin uso; fundamental para políticas de bloqueo.

Datos:
- `reservation_id`, `user_id`, `desk_code`
- `no_show_at`
- `count_per_user`
- `incidence_rate` (%)

#### 8.4. Auditoría por actor
Trazabilidad de acciones admin, para compliance/control.

Datos:
- `actor_user_id`, `actor_email`
- `event_type` (admin_action, reservation_checked_in, etc.)
- `timestamp`
- `count_acciones`

### Endpoints recomendados para reportes

Agregar a la familia `/admin`:

- `GET /admin/reports/occupancy?start=YYYY-MM-DD&end=YYYY-MM-DD&office_id=uuid&zone_id=uuid`
  - retorna ocupación por desk + agregados por zona
  
- `GET /admin/reports/cancellations?start=YYYY-MM-DD&end=YYYY-MM-DD&period=day|week|month`
  - retorna listado de cancelaciones agrupadas por usuario/período
  
- `GET /admin/reports/no-shows?start=YYYY-MM-DD&end=YYYY-MM-DD`
  - retorna incidencia de no-shows por usuario + fecha
  
- `GET /admin/reports/audit-log?start=YYYY-MM-DD&end=YYYY-MM-DD&actor_id=uuid&event_type=admin_action`
  - retorna evento de auditoría filtrados para compliance

- `GET /admin/reports/summary?period=today|this_week|this_month`
  - dashboard rápido: ocupación hoy, cancelaciones semana, no-shows mes, etc.

### Recomendación técnica
Los reportes se construyen desde `reservations` + `audit_events` con agregaciones simples en SQL.
No requieren tabla adicional de datos analíticos en v1; puede evolucionar a datawarehouse/BI tool en futuro.

### Visualización recomendada
Todos los reportes deben ser exportables a CSV para análisis externo.

---

## 9. Estrategia de evolución

## Fase 1
- cerrar decisiones funcionales
- rediseñar `reservations`
- definir settings
- añadir `user_preferences`
- añadir layout persistente

## Fase 2
- adaptar OpenAPI
- crear migraciones
- actualizar seeds
- adaptar frontend Lovable a nuevos contratos

## Fase 3
- opcional:
  - integración futura con Microsoft/SSO
  - mejoras de reporting
  - features adicionales

---

## 10. Decisiones finales resumidas

### Se mantiene porque aporta valor real
- oficinas
- zonas
- escritorios
- layout persistente
- bloqueos
- auditoría
- settings admin

### Se simplifica porque hoy sobra o complica
- multi-tenant operativo real
- floors
- policies actuales con horarios globales de check-in
- reservas limitadas a solo fecha
- check-in centrado en QR+fecha como contrato principal

### Se añade porque el producto lo necesita
- preferencias de usuario
- invitados controlados por admin
- layout persistente
- reservas por rango

---

## 11. Conclusión

La simplificación recomendada **no consiste en recortar entidades útiles**, sino en:

- mantener la parte espacial y admin que sí tiene valor
- congelar la parte SaaS/multi-tenant que hoy no aporta
- rediseñar reservas y check-in de forma más coherente
- separar claramente:
  - identidad
  - preferencias
  - configuración global
  - layout
  - operación

El resultado buscado es un backend **más simple de operar**, **más coherente con Camerfirma interno** y **mejor preparado para el panel admin real** sin perder capacidad de evolución futura.
