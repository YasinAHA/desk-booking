# Tasks v0.4.0

## 1) Auth y seguridad
- [x] Registro con confirmacion por email.
- [x] Servicio SMTP y plantilla de email de confirmacion.
- [x] Endpoint de registro (crear usuario + enviar confirmacion).
- [x] Refresh/verify token en frontend (session persistente real).
- [x] Rate limiting en endpoints sensibles.
- [x] CORS restringido al dominio real.

## 2) Calidad
- [x] Tests de rutas (auth, desks, reservations).
- [x] Tests de errores HTTP (401, 403, 404, 409).
- [x] Setup de CI basico (test + build).

## 3) Observabilidad
- [x] Logs estructurados por request (request id).
- [x] Trazas basicas en operaciones criticas.

## 4) Base de datos
- [x] Migraciones versionadas (mas alla del init).
- [x] Seeds controlados por entorno.

## 5) Frontend
- [x] Mensajes de error mas claros y guiados.
- [x] Pantalla de estado / loading global.
- [x] Pulido UX (feedback de reserva/cancelacion).