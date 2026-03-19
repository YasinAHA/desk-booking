# Floorplan API Handoff (Lovable)

Estado: backend listo para integrar el editor de plano.

## Base URL y auth
- Prefix v1: `/api/internal/desk-booking/v1`
- Auth: `Authorization: Bearer <accessToken>`
- Content-Type: `application/json`

## Flujo recomendado frontend
1. Cargar config de plano: `GET /admin/floorplan?officeId=...`
2. Cargar desks (para nodos drag&drop): `GET /admin/desks?officeId=...&page=1&pageSize=200`
3. Cargar overlays: `GET /admin/floorplan/overlays?officeId=...`
4. Guardar cambios de posiciones: `PATCH /admin/desks/layout/bulk`
5. Restaurar posiciones: `POST /admin/desks/layout/restore`

## Endpoints clave

### 1) GET `/admin/floorplan?officeId=<uuid>`
Devuelve config del canvas y fondo.

Respuesta ejemplo:
```json
{
  "officeId": "b1111111-1111-4111-8111-111111111111",
  "floorplanImageUrl": "https://cdn.example/floorplan.png",
  "canvasWidth": 1600,
  "canvasHeight": 900,
  "effectiveCanvasWidth": 1600,
  "effectiveCanvasHeight": 900,
  "hasBackgroundImage": true
}
```

### 2) GET `/admin/desks`
Query soportada:
- `officeId?`, `zoneId?`, `status?`, `includeArchived?`, `q?`
- `page?`, `pageSize?`, `sortBy?=deskCode|zoneName|status|displayOrder`, `sortDir?=asc|desc`

Respuesta ejemplo:
```json
{
  "items": [
    {
      "id": "a1111111-1111-4111-8111-111111111111",
      "officeId": "b1111111-1111-4111-8111-111111111111",
      "zoneId": "c1111111-1111-4111-8111-111111111111",
      "zoneName": "SALA ABIERTA",
      "code": "P01",
      "name": "Puesto 01",
      "status": "active",
      "statusReason": null,
      "qrPublicId": "qr-public-001",
      "layoutX": 320,
      "layoutY": 540,
      "layoutW": 1,
      "layoutH": 1,
      "rotationDeg": 0,
      "displayOrder": 10,
      "archivedAt": null
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 200
}
```

### 3) PATCH `/admin/desks/layout/bulk` (Save positions)
Guarda varias posiciones en una sola llamada.

Request ejemplo:
```json
{
  "items": [
    {
      "id": "a1111111-1111-4111-8111-111111111111",
      "layoutX": 320,
      "layoutY": 540,
      "layoutW": 1,
      "layoutH": 1,
      "rotationDeg": 0,
      "displayOrder": 10
    },
    {
      "id": "a2222222-1111-4111-8111-111111111111",
      "layoutX": 430,
      "layoutY": 500,
      "displayOrder": 11
    }
  ]
}
```

Respuesta:
```json
{
  "ok": true,
  "updated": 2,
  "items": []
}
```

Notas:
- `items` min 1, max 500.
- Cada item requiere `id` + al menos un campo de layout.

### 4) POST `/admin/desks/layout/restore` (Restore)
Restaura layout persistido de desks activos.
- `layoutX/Y/W/H -> null`
- `rotationDeg -> 0`
- `displayOrder -> 0`

Request ejemplo:
```json
{
  "officeId": "b1111111-1111-4111-8111-111111111111",
  "zoneId": "c1111111-1111-4111-8111-111111111111"
}
```

Respuesta:
```json
{
  "ok": true,
  "updated": 12,
  "items": []
}
```

### 5) Overlays (salas/zonas)

#### GET `/admin/floorplan/overlays?officeId=<uuid>`
Lista overlays.

#### POST `/admin/floorplan/overlays?officeId=<uuid>`
Crea overlay.

Request:
```json
{
  "label": "SALA ROMA",
  "kind": "room",
  "x": 710,
  "y": 280,
  "w": 120,
  "h": 160,
  "rotationDeg": 0,
  "strokeColor": "#d6d8de",
  "fillColor": null,
  "displayOrder": 2
}
```

#### PATCH `/admin/floorplan/overlays/{id}?officeId=<uuid>`
Actualiza overlay (parcial).

#### DELETE `/admin/floorplan/overlays/{id}?officeId=<uuid>`
Elimina overlay.

## Errores esperados
- `400 BAD_REQUEST`: query/body inválido.
- `401 UNAUTHORIZED`: token ausente/expirado.
- `403 FORBIDDEN`: usuario no admin.
- `404 NOT_FOUND`: recurso no encontrado (p.ej. overlay/oficina).

## Recomendaciones de integración Lovable
- Modelar `Save positions` como operación explícita (no autosave por drag).
- Mantener un estado local `dirty` y enviar solo desks cambiados en el bulk.
- Tras `restore`, recargar `GET /admin/desks` para sincronizar canvas.
- Para canvas, usar `effectiveCanvasWidth/Height` como fallback siempre.
