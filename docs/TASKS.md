# Tasks v0.3.0

Checklist operativo para cerrar la version 0.3.0 (backend base).

## 1) Contrato y docs
- [x] Definir endpoints minimos en docs/API.md (auth, desks, reservations).
- [x] Especificar schemas de request/response y codigos de error.
- [x] Actualizar docs/ARCHITECTURE.md si cambia el flujo.

## 2) Backend base
- [x] Crear middleware de auth JWT.
- [x] Implementar rutas y handlers (auth, desks, reservations).
- [x] Validacion de entrada con Zod.
- [x] Manejo de errores consistente (errores tipados + logging).

## 3) Capa de datos
- [x] Repositorios/queries para users, desks y reservations.
- [x] Regla: 1 reserva por usuario y dia.
- [x] Regla: 1 reserva por desk y dia.

## 4) Frontend minimo
- [x] Conexion a API (login, listar desks por fecha).
- [x] Reservar y cancelar.
- [x] Estado basico y feedback de errores.

## 5) Calidad minima
- [x] Tests base para servicios de reservations.

## 6) Release
- [x] Actualizar CHANGELOG.md.
- [x] Revisar README (estado y arranque).
- [ ] Tag v0.3.0.
