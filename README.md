# Desk Booking Platform

Plataforma de reservas internas de escritorios orientada a uso empresarial y concebida como
**Trabajo de Fin de Máster (TFM)**, con un enfoque profesional, escalable y alineado con
buenas prácticas de arquitectura, backend moderno y despliegue real.

El proyecto evoluciona desde una primera versión funcional hacia una solución completa,
lista para ser utilizada en un entorno corporativo.

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
│       ├── lib/
│       ├── modules/
│       └── plugins/
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
│   └── SCOPE.md
```

---

## 🧱 Stack tecnológico

### Backend
- Node.js
- Fastify
- TypeScript
- PostgreSQL
- JWT
- Zod
- Swagger / OpenAPI
- Docker

### Frontend
- HTML, CSS, JavaScript
- Migración a TypeScript planificada

---

## 🤖 Uso de IA

La IA se utiliza como **apoyo al desarrollo**.
Guia de trabajo: ver [docs/AI-GUIDE.md](docs/AI-GUIDE.md).

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

3) Configura el backend:
- Copia `backend/.env.example` a `backend/.env`
- Ajusta `DATABASE_URL`, `JWT_SECRET` y `ALLOWED_EMAIL_DOMAINS`

4) Arranca la API:
```bash
npm run dev:api
```

5) Healthcheck:
- `GET http://localhost:3001/health`

---

## 📌 Estado actual
- Backend base (Fastify + Postgres) funcional.
- Frontend minimo conectado a API.
- Schema inicial en [docker/postgres/init/001_init.sql](docker/postgres/init/001_init.sql).

---

## ✅ Tareas v0.3.0
Ver checklist en [docs/TASKS.md](docs/TASKS.md).

## 🧭 Backlog v0.4.0
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
- v0.4.0 → Frontend TypeScript
- v1.0.0 → Versión final TFM

---

## 👤 Autor

Yassine Ait El Hadj Ahajtan

---

## 📜 Licencia

MIT
