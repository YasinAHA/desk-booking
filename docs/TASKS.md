# Tasks v0.5.0

Objetivo: reducir deuda tecnica y reorganizar la arquitectura con SOLID, Clean Architecture, DRY, KISS y patrones de diseno.

Nota: estas propuestas se mueven a este fichero tras cerrar la v0.4.0.

## 1) Capas y contratos
- [x] Definir capas (domain, application, infrastructure, interfaces).
- [x] Crear interfaces de repositorios (Users, Desks, Reservations).
- [x] Crear interfaz de notificaciones (Notifier).

## 2) Repositorios
- [x] Implementar repositorios Postgres (PgUserRepository, PgDeskRepository, PgReservationRepository).
- [x] Eliminar acceso directo a `app.db` desde servicios.
- [x] Tests unitarios de repositorios con mocks.

## 3) Use cases
- [x] AuthUseCase desacoplado de Fastify.
- [x] ReservationUseCase con reglas de negocio en dominio.
- [x] EmailConfirmationUseCase en capa de aplicacion.

## 4) Infraestructura
- [x] Mailer como adaptador de infraestructura.
- [x] Config centralizada con esquema.
- [x] Logger con contexto (request id) y adaptadores.

## 5) API / Interfaces
- [x] Rutas delgadas (HTTP -> DTO -> use case).
- [x] Contenedores por feature para wiring de dependencias.
- [x] Manejo de errores estandarizado en un middleware.

## 6) Observabilidad
- [x] Logging estructurado por request.
- [x] Metricas basicas (opcional).

## 7) Testing
- [x] Tests unitarios de use cases.
- [x] Tests de integracion minimos (repos + API).
