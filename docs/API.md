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

## Endpoints actuales

### Healthcheck
`GET /health`
Respuesta:
```json
{ "ok": true }
```

## Endpoints actuales (v0.3.x)

### Auth
Nota: el login solo valida usuarios existentes. Registro explicito con confirmacion por email queda pendiente.

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
	"token": "jwt",
	"user": {
		"id": "uuid",
		"email": "user@company.com",
		"display_name": "User"
	}
}
```
Errores: 400, 401

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
		"display_name": "User"
	}
}
```
Errores: 400, 401

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
			"code": "D01",
			"name": "Puesto 01",
			"is_active": true,
			"is_reserved": false,
			"is_mine": false,
			"reservation_id": null
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
	"desk_id": "uuid"
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

#### `DELETE /reservations/:id`
Response 200:
```json
{
	"ok": true
}
```
Errores: 401, 403, 404

#### `GET /reservations/me`
Response 200:
```json
{
	"items": [
		{
			"id": "uuid",
			"desk_id": "uuid",
			"desk_name": "Puesto 01",
			"reserved_date": "2026-02-07",
			"cancelled_at": null
		}
	]
}
```
Errores: 401

> Nota: el contrato se valida con Zod. OpenAPI queda pendiente.

## Datos (DB)

### users
- id
- email
- password_hash
- display_name

### desks
- id
- code
- name
- is_active

### reservations
- id
- user_id
- desk_id
- reserved_date
- cancelled_at
