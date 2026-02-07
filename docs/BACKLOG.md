# Backlog v0.4.0 (propuesto)

## 1) Auth y seguridad
- [ ] Registro con confirmacion por email.
- [ ] Refresh/verify token en frontend (session persistente real).
- [ ] Rate limiting en endpoints sensibles.
- [ ] CORS restringido al dominio real.

## 2) Calidad
- [ ] Tests de rutas (auth, desks, reservations).
- [ ] Tests de errores HTTP (401, 403, 404, 409).
- [ ] Setup de CI basico (test + build).

## 3) Observabilidad
- [ ] Logs estructurados por request (request id).
- [ ] Trazas basicas en operaciones criticas.

## 4) Base de datos
- [ ] Migraciones versionadas (mas alla del init).
- [ ] Seeds controlados por entorno.

## 5) Frontend
- [ ] Mensajes de error mas claros y guiados.
- [ ] Pantalla de estado / loading global.
- [ ] Pulido UX (feedback de reserva/cancelacion).
