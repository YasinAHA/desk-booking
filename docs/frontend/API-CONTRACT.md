# API Contract Frontend

Reglas para consumir backend desde frontend sin drift.

## Fuente de verdad
- OpenAPI del backend (`/openapi.json`) y handlers HTTP backend.
- No duplicar contratos manualmente si ya existen tipos generados.

## Convenciones de payload
- Usar `camelCase` en frontend.
- Mantener mapeo explícito si existiese un endpoint legacy distinto.

## Errores
- Formato esperado:
  - `error.code`
  - `error.message`
- El frontend decide UX por `error.code`, no por texto libre.
- Todos los errores de red/HTTP/backend se convierten a `ApiError` unificado:
  - `status`
  - `code`
  - `message`
  - `details?`

## Auth
- Endpoints principales:
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `POST /auth/logout`
  - `POST /auth/verify`
- Estrategia:
  - Access token para requests autenticadas.
  - Refresh al recibir 401 una vez.
  - Si refresh falla: limpiar sesión y redirigir a login.

## Reservas
- Crear reserva: controlar códigos de conflicto específicos (`DESK_ALREADY_RESERVED`, `USER_ALREADY_HAS_RESERVATION`, etc.).
- Cancelar reserva: contemplar `RESERVATION_NOT_CANCELLABLE` y `CANCELLATION_WINDOW_CLOSED`.
- Check-in QR: contemplar `RESERVATION_NOT_FOUND` y `RESERVATION_NOT_ACTIVE`.

## Admin desks
- `GET /desks/admin`
- `POST /desks/admin/:id/qr/regenerate`
- `POST /desks/admin/qr/regenerate-all`
- Mostrar 403 sin filtrar detalles internos.

## Generación de tipos
- Generar tipos TS desde OpenAPI con `openapi-typescript`.
- Versionar el comando/script de generación.
- Ejecutar en CI para detectar drift de contrato.
- Nunca modificar manualmente los ficheros generados.
- Las transformaciones DTO -> modelo de UI van en `feature/model/*mapper*`.
