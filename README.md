# Desk Booking (Desk Booking MVP)

Aplicación web ligera para **reservas internas de escritorios** (hot desk).  
Objetivo: permitir que empleados reserven un puesto por día, consultar ocupación y gestionar sus reservas.

> Estado actual: **MVP (pre-1.0)** en iteración. Este repositorio prioriza claridad, buenas prácticas y evolución hacia un producto estable.

---

## Demo / Deploy
- **URL (si existe):** _pendiente_

---

## Funcionalidades principales
- Login por **Magic Link** (Supabase Auth).
- Selección de **fecha** y visualización de ocupación por puesto.
- **Reservar** un escritorio libre.
- **Cancelar** una reserva propia.
- Sección **“Mis reservas”** (activas y futuras).
- Reglas básicas: no fechas pasadas, límite de días vista y (opcional) bloqueo de fines de semana.

---

## Stack tecnológico
- **Frontend:** HTML + CSS + JavaScript (vanilla)
- **Backend-as-a-Service:** Supabase
  - Auth (OTP / Magic Link)
  - PostgreSQL + RLS (Row Level Security)
  - RPC (funciones SQL) para lógica de reserva

> En versiones posteriores puede migrarse a una arquitectura más escalable (p.ej. Vite/TypeScript/React) manteniendo el core de negocio en SQL/RPC y RLS.

---

## Requisitos previos
- Tener un proyecto en **Supabase** (URL + anon key).
- Haber aplicado las migraciones SQL del directorio `supabase/migrations/`.

---

## Instalación y ejecución en local
1. Copia el fichero de configuración:
   - `app/config.example.js` → `app/config.js`
2. Rellena en `app/config.js`:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `ALLOWED_EMAIL_DOMAINS`
   - `MAX_DAYS_AHEAD`
   - `ALLOW_WEEKENDS`
3. Levanta un servidor estático para `app/`:

**Opción A (Python):**
```bash
cd app
python -m http.server 5500
```
Abrir: `http://localhost:5500`

**Opción B (VS Code Live Server):**
- Abrir `app/index.html` con Live Server.

> Importante: Supabase Auth con Magic Link necesita una URL consistente. Si cambias host/puerto, actualiza el redirect en Supabase y/o el `emailRedirectTo`.

---

## Estructura del proyecto
```
yasinaha-desk-booking/
├── README.md
├── LICENSE
├── app/
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── supabaseClient.js
│   ├── config.example.js
│   └── config.js                 # (no versionar)
├── docs/
│   ├── SCOPE.md
│   └── DECISIONS.md
└── supabase/
    ├── README.md
    └── migrations/
        ├── 001_init.sql
        └── 002_rpc.sql
```

---

## Supabase
Lee `supabase/README.md` para:
- Esquema de tablas
- Configuración de **RLS**
- Funciones **RPC** (`get_desk_occupancy`, `create_reservation`, `cancel_my_reservation`)

---

## Buenas prácticas del repo (enfoque TFM)
- **Control de versiones**: commits frecuentes, tags semver para hitos (pre-1.0).
- **Docs**: decisiones técnicas y alcance en `docs/`.
- **Calidad**: se prioriza arquitectura limpia, SOLID, pruebas (TDD) y evolución controlada.
- **IA**: se documentará el uso de IA como apoyo (no como sustituto) en decisiones/diseño.

---

## Roadmap (orientativo)
- **0.2.x**: estabilización del MVP (sesión, refrescos, UX, bugs).
- **0.3.x**: arquitectura modular (separación UI / dominio / infra) y base para tests.
- **0.4.x**: observabilidad (logs), hardening RLS, rate limits, manejo offline/tab focus.
- **1.0.0**: versión estable (despliegue, docs completas, slides, checklist TFM).

---

## Licencia
Ver `LICENSE`.
