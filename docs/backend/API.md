# API

## Base URL
- Local: `http://localhost:3001`

## Auth
- Header: `Authorization: Bearer <token>`

## Errores (formato comun)
```json
{
	"error": {
		"code": "string",
		"message": "string"
	}
}
```

## Endpoints

### Healthcheck
`GET /health`
Respuesta:
```json
{ "ok": true }
```

### Auth
Nota: el login solo permite usuarios confirmados por email.

#### `POST /auth/register`
Request:
```json
{
	"email": "user@company.com",
	"password": "string",
	"first_name": "User",
	"last_name": "Company",
	"second_last_name": "Optional"
}
```
Response 200:
```json
{ "ok": true }
```
Errores: 400, 403, 409

#### `POST /auth/login`
Request:
```json
{
	"email": "user@company.com",
	"password": "string"
}
```
Response 200:
```json
{
	"accessToken": "jwt",
	"refreshToken": "jwt",
	"user": {
		"id": "uuid",
		"email": "user@company.com",
		"first_name": "User",
		"last_name": "Company",
		"second_last_name": null
	}
}
```
Errores: 400, 401

#### `GET /auth/confirm?token=...`
Response 200:
```json
{ "ok": true }
```
Errores: 400

#### `POST /auth/verify`
Request:
```json
{
	"token": "jwt"
}
```
Response 200:
```json
{
	"valid": true,
	"user": {
		"id": "uuid",
		"email": "user@company.com",
		"first_name": "User",
		"last_name": "Company",
		"second_last_name": null
	}
}
```
Errores: 400, 401

#### `POST /auth/refresh`
Request:
```json
{
	"token": "jwt_refresh"
}
```
Response 200:
```json
{
	"accessToken": "jwt",
	"refreshToken": "jwt_refresh"
}
```
Nota: en cada refresh exitoso se emite un **nuevo** `refreshToken` (rotation). El token de refresh usado queda revocado.
Errores: 400, 401

#### `POST /auth/forgot-password`
Request:
```json
{
	"email": "user@company.com"
}
```
Response 200:
```json
{ "ok": true }
```
Nota: la respuesta es generica (misma salida exista o no exista la cuenta) para evitar enumeracion.
Errores: 400

#### `POST /auth/reset-password`
Request:
```json
{
	"token": "reset_token",
	"password": "NewStrongPassword123!"
}
```
Response 200:
```json
{ "ok": true }
```
Errores: 400 (`INVALID_TOKEN`, `EXPIRED_TOKEN`, `WEAK_PASSWORD`), 409 (`TOKEN_ALREADY_USED`)

#### `POST /auth/change-password`
Header:
`Authorization: Bearer <access_token>`
Request:
```json
{
	"current_password": "CurrentPassword123!",
	"new_password": "NewStrongPassword123!"
}
```
Response 200:
```json
{ "ok": true }
```
Errores: 400 (`WEAK_PASSWORD`), 401 (`INVALID_CREDENTIALS`, `UNAUTHORIZED`)

#### `POST /auth/logout`
Response 204 (sin body)
Errores: 401

### Desks
#### `GET /desks?date=YYYY-MM-DD`
Response 200:
```json
{
	"date": "2026-02-07",
	"items": [
		{
			"id": "uuid",
			"officeId": "uuid",
			"code": "D01",
			"name": "Puesto 01",
			"status": "active",
			"isReserved": false,
			"isMine": false,
			"reservationId": null,
			"occupantName": null
		}
	]
}
```
Errores: 400, 401

### Reservations
#### `POST /reservations`
Request:
```json
{
	"date": "2026-02-07",
	"desk_id": "uuid",
	"office_id": "uuid",
	"source": "user"
}
```
Response 200:
```json
{
	"ok": true,
	"reservation_id": "uuid"
}
```
Errores: 400, 401, 409
> Nota: 400 incluye `DATE_INVALID` (fecha inválida de calendario) y `DATE_IN_PAST` (fecha anterior a hoy).

#### `DELETE /reservations/:id`
Response 204 (sin body)
Errores: 400, 401, 404
> Nota: 400 incluye `CANNOT_CANCEL_PAST` cuando la reserva es de un dia pasado.

#### `GET /reservations/me`
Response 200:
```json
{
	"items": [
		{
			"reservation_id": "uuid",
			"desk_id": "uuid",
			"office_id": "uuid",
			"desk_name": "Puesto 01",
			"reservation_date": "2026-02-07",
			"source": "user",
			"cancelled_at": null
		}
	]
}
```
Errores: 401

### Metricas
#### `GET /metrics`
Response 200:
```json
{
	"startedAt": 0,
	"uptimeSeconds": 0,
	"totals": {
		"count": 0,
		"errors4xx": 0,
		"errors5xx": 0
	},
	"routes": {
		"GET /desks": {
			"count": 0,
			"errors4xx": 0,
			"errors5xx": 0,
			"avgMs": 0,
			"p95Ms": 0
		}
	}
}
```
> Nota: el contrato se valida con Zod. OpenAPI queda pendiente.

## Datos (DB)

### users
- id
- email
- password_hash
- first_name
- last_name
- second_last_name

### desks
- id
- code
- name
- status
- office_id

### reservations
- id
- user_id
- desk_id
- office_id
- reservation_date
- status
- source
- cancelled_at
