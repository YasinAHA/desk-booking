# Decisiones

Registro de decisiones clave para mantener coherencia tecnica.

| Fecha | Decision | Motivo |
| --- | --- | --- |
| 2026-02-07 | Backend propio en Fastify + TypeScript | Control total de arquitectura y TFM orientado a backend desacoplado. |
| 2026-02-07 | Postgres local via Docker | Entorno reproducible y cercano a produccion. |
| 2026-02-07 | Monorepo (backend + frontend) | Evolucion coordinada y versionado unico. |
| 2026-02-07 | Auth con JWT | Simplicidad, control de sesiones y compatibilidad con Fastify. |
| 2026-02-07 | SemVer y changelog | Trazabilidad y hitos del TFM. |
| 2026-02-07 | Documentar tags en README y changelog | Facilitar contexto de versiones previas y mantener historico claro. |
| 2026-02-08 | v0.5.0 orientada a refactor arquitectonico | Reducir deuda tecnica aplicando SOLID/Clean Architecture. |
| 2026-02-08 | Capas de arquitectura definidas | Separar domain, application, infrastructure e interfaces. |
| 2026-02-08 | Use cases solo dependen de ports | Evitar acoplamientos entre use cases y con infraestructura. |
| 2026-02-08 | Errores de dominio tipados | Evitar `Error("CODE")` y mapear en interfaces HTTP. |
| 2026-02-08 | Respuestas de auth genericas | Minimizar enumeracion de cuentas en login/registro. |
| 2026-02-08 | Serializacion en infraestructura | Fechas/formatos se resuelven en adaptadores, no en use cases. |
| 2026-02-08 | Constantes centralizadas | Limites y regex en `backend/src/config/constants.ts`. |
| 2026-02-15 | Estrategia de versionado por madurez | v1.0.0 como release interna (Camerfirma). Multi-org/SaaS se reserva para v2.0.0. |
| 2026-02-16 | Convencion de mensajes de commit y tags en ingles | Mantener consistencia historica, facilitar lectura en PRs/releases y evitar mezcla de idiomas en el historial. |

