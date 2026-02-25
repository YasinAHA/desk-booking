# AI Guide Frontend

Guía operativa para implementar y mantener un frontend productivo, tipado y sin deuda evitable.

## Alcance
- UI, experiencia de usuario y consumo de API.
- Arquitectura de módulos frontend.
- Calidad, pruebas y workflow de entrega.

## Fuentes de verdad
- [../AI-GUIDE.md](../AI-GUIDE.md)
- [../ARCHITECTURE.md](../ARCHITECTURE.md)
- [ARCHITECTURE-FRONTEND.md](ARCHITECTURE-FRONTEND.md)
- [API-CONTRACT.md](API-CONTRACT.md)
- [QUALITY-GATES.md](QUALITY-GATES.md)
- [FRONTEND-DECISIONS.md](FRONTEND-DECISIONS.md)
- [RUNBOOK-FRONTEND.md](RUNBOOK-FRONTEND.md)
- [TASKS.md](TASKS.md)

## Reglas de ejecución
- Respetar OpenAPI/backend como contrato único. No inventar campos ni códigos.
- Mantener lógica de negocio en backend. Frontend solo orquesta estados y UX.
- Aplicar arquitectura por capas frontend definida en `ARCHITECTURE-FRONTEND.md`.
- Todo código nuevo en TypeScript.
- Convención de naming: `kebab-case` para archivos; `camelCase` para variables; `PascalCase` para componentes.
- No introducir librerías fuera de `FRONTEND-DECISIONS.md` sin documentar decisión.

## Reglas de auth y sesión
- Flujo obligatorio: `401 -> refresh -> retry` una única vez.
- Si refresh falla, limpiar sesión y redirigir a login.
- No almacenar secretos distintos de tokens de sesión necesarios.
- Mantener mensajes anti-enumeración consistentes con backend.

## Calidad mínima por cambio
- `lint` en verde.
- `typecheck` en verde.
- tests unit/integration relevantes en verde.
- e2e de flujos críticos en verde cuando aplique.
- documentación actualizada si cambia contrato o comportamiento visible.

## Prohibiciones explícitas

- No realizar fetch directamente en componentes.
- No modificar archivos generados por OpenAPI.
- No duplicar lógica de transformación fuera de mappers.
- No mezclar responsabilidades entre `api/`, `model/`, `queries/`, `ui/`.
- No introducir estado global fuera del auth context.

## Formato de salida esperado para LLM

- Respetar estrictamente la estructura de carpetas definida.

## Modo auditoría

Cuando se solicite revisión:

- Detectar violaciones de separación de responsabilidades.
- Detectar acceso directo a fetch.
- Detectar uso incorrecto de tipos OpenAPI.
- Detectar lógica de negocio en UI.
- Detectar dependencia cruzada entre features.