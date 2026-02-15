# Desk Booking Platform

Plataforma de reservas internas de escritorios orientada a uso empresarial y concebida como
**Trabajo de Fin de Máster (TFM)**, con un enfoque profesional, escalable y alineado con
buenas prácticas de arquitectura, backend moderno y despliegue real.

El proyecto evoluciona desde una primera versión funcional hacia una solución completa,
lista para ser utilizada en un entorno corporativo.

**Estado actual:** v0.5.0 (Technical consolidation) con schema v1.0.0 alineado. Listo para Camerfirma Internal Release.

---

## 🎯 Objetivo del proyecto

Desarrollar una aplicación real que demuestre:

- Dominio de **arquitectura de software**
- Uso de **principios SOLID**
- Diseño de **backend desacoplado y escalable**
- Persistencia con **PostgreSQL**
- Autenticación segura
- Preparación para **TDD**
- Uso de **IA como apoyo al desarrollo** (no como feature artificial)
- Despliegue realista (Docker / cloud / entorno empresarial)

El objetivo no es solo que funcione, sino que esté **bien diseñada, documentada y mantenible**.

---

## 🧠 Enfoque TFM

- Proyecto **original y con aplicación real**
- Backend propio (sin dependencia de BaaS como Supabase)
- Arquitectura pensada para crecer y mantenerse
- Documentación clara y razonada
- Control de versiones desde el inicio
- Evolución planificada por versiones

---

## 🗂️ Estructura del proyecto (Monorepo)

```
yasinaha-desk-booking/
├── README.md
├── CHANGELOG.md
├── LICENSE
├── .editorconfig
├── backend/
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── app.ts
│       ├── server.ts
│       ├── config/
│       ├── domain/
│       │   └── entities/
│       ├── application/
│       │   ├── ports/
│       │   └── usecases/
│       ├── infrastructure/
│       │   ├── notifiers/
│       │   └── repositories/
│       ├── interfaces/
│       │   └── http/
│       │       ├── auth/
│       │       ├── desks/
│       │       ├── metrics/
│       │       ├── reservations/
│       │       ├── plugins/
│       │       └── types/
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── src/
│       ├── apiClient.js
│       ├── app.js
│       └── state.js
├── docker/
│   ├── docker-compose.yml
│   └── postgres/
│       └── init/
│           └── 001_init.sql
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DECISIONS.md
│   ├── KNOWN-ISSUES.md
│   ├── SCOPE.md
│   ├── TOOLING.md
│   └── DEPLOYMENT.md
```

Nota: `src/config` es configuracion compartida entre capas.


---

## 🧱 Stack tecnológico

### Backend
- Node.js
- Fastify 5.7.4
- TypeScript (strict mode)
- PostgreSQL 13+
- JWT (access + refresh tokens with jti)
- Argon2 (password hashing)
- Helmet 13.0.2 (HTTP security headers: CSP + HSTS)
- Zod (schema validation)
- Swagger / OpenAPI
- Docker

### Frontend
- HTML, CSS, JavaScript
- Migración a TypeScript planificada

---

## 🤖 Uso de IA

La IA se utiliza como **apoyo al desarrollo**.
Guia de trabajo: ver [docs/AI-GUIDE.md](docs/AI-GUIDE.md).

Tooling del repo: ver [docs/TOOLING.md](docs/TOOLING.md).
Despliegue (TFM): ver [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## ✅ Requisitos
- Node.js (LTS recomendado)
- Docker (para Postgres local)

---

## ▶️ Arranque rapido (dev)

1) Instala dependencias:
```bash
npm install
```

2) Levanta la base de datos:
```bash
npm run dev:db
```

Opcional (email local):
- Mailpit SMTP: `localhost:1025`
- UI Mailpit: `http://localhost:8025`

3) Configura el backend:
- Copia `backend/.env.example` a `backend/.env`
- Ajusta `DATABASE_URL`, `JWT_SECRET` y `ALLOWED_EMAIL_DOMAINS`

4) Aplica migraciones y seeds:
```bash
npm run db:migrate
npm run db:seed:dev
```

5) Arranca la API:
```bash
npm run dev:api
```

6) Healthcheck:
- `GET http://localhost:3001/health`

---

## 📌 Estado actual
- Backend base (Fastify + Postgres) funcional.
- Frontend minimo conectado a API.
- Schema inicial en [docker/postgres/init/001_init.sql](docker/postgres/init/001_init.sql).
- CI basico con GitHub Actions (test + build).
- Metricas basicas disponibles en `GET /metrics`.

---

## ✅ Tareas v0.5.0
Ver checklist en [docs/TASKS.md](docs/TASKS.md).

## 🧭 Backlog v0.6.0
Ver propuestas en [docs/BACKLOG.md](docs/BACKLOG.md).

---

## 🏷️ Versiones
- v0.1.0: base UI + skeleton magic link ([tag](https://github.com/YasinAHA/desk-booking/releases/tag/v0.1.0), ver [CHANGELOG.md](CHANGELOG.md)).
- v0.2.0: piloto estable con flujo de reservas ([tag](https://github.com/YasinAHA/desk-booking/releases/tag/v0.2.0), ver [CHANGELOG.md](CHANGELOG.md)).
- v0.3.0: backend propio + frontend minimo (ver [CHANGELOG.md](CHANGELOG.md)).

---

## 🚀 Roadmap
- 0.2.x: estabilización del MVP (sesión, refrescos, UX, bugs).
- v0.3.0 → Backend propio y arquitectura base
- v0.5.0 → Refactor arquitectonico (Clean Architecture)
- v0.6.0 → Seguridad, roles y observabilidad
- v1.0.0 → Versión final TFM

---

## 👤 Autor

Yassine Ait El Hadj Ahajtan

---

## 📜 Licencia

MIT
