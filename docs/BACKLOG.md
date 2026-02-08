# Backlog v0.5.0 (propuesto)

Objetivo: reducir deuda tecnica y reorganizar la arquitectura con SOLID, Clean Architecture, DRY, KISS y patrones de diseno.

Nota: estas propuestas se moveran a `docs/TASKS.md` una vez tagueada y cerrada la v0.4.0.

## 1) Capas y contratos
- [ ] Definir capas (domain, application, infrastructure, interfaces).
- [ ] Crear interfaces de repositorios (Users, Desks, Reservations).
- [ ] Crear interfaz de notificaciones (Notifier).

## 2) Repositorios
- [ ] Implementar repositorios Postgres (PgUserRepository, PgDeskRepository, PgReservationRepository).
- [ ] Eliminar acceso directo a `app.db` desde servicios.
- [ ] Tests unitarios de repositorios con mocks.

## 3) Servicios de dominio
- [ ] AuthService desacoplado de Fastify.
- [ ] ReservationService con reglas de negocio en dominio.
- [ ] EmailConfirmationService en capa de aplicacion.

## 4) Infraestructura
- [ ] Mailer como adaptador de infraestructura.
- [ ] Config centralizada con esquema.
- [ ] Logger con contexto (request id) y adaptadores.

## 5) API / Interfaces
- [ ] Rutas delgadas (HTTP -> DTO -> use case).
- [ ] Manejo de errores estandarizado en un middleware.

## 6) Observabilidad
- [ ] Logging estructurado por request.
- [ ] Metricas basicas (opcional).

## 7) Testing
- [ ] Tests unitarios de use cases.
- [ ] Tests de integracion minimos (repos + API).
