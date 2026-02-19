# AI Guide Backend

Guía operativa para cambios de backend.

## Fuentes de verdad (orden de prioridad)
- [TASKS.md](TASKS.md)
- [ARCHITECTURE-BACKEND.md](ARCHITECTURE-BACKEND.md)
- [../architecture-audit/ARCHITECTURE-AUDIT-v0.X.md](../architecture-audit/ARCHITECTURE-AUDIT-v0.X.md)
- [../DECISIONS.md](../DECISIONS.md)
- [../../CHANGELOG.md](../../CHANGELOG.md)
- Histórico v0.6.x: [archive/ARCHITECTURE-V0.6-PLAN.md](archive/ARCHITECTURE-V0.6-PLAN.md)

## Estado y alcance
- Arquitectura por capas + agrupación por feature completada en v0.6.x.
- Trabajo funcional nuevo pasa a v0.7.0 (por ejemplo recuperación/cambio de contraseña).
- Objetivo actual: estabilidad, trazabilidad y cambios incrementales.

## Reglas arquitectónicas no negociables
- Dependencias hacia adentro: `interfaces -> application -> domain`.
- `application` no importa `infrastructure` ni `interfaces`.
- `domain` no conoce framework, DB ni HTTP.
- Adaptadores concretos solo en `infrastructure` o `interfaces`.
- `composition` crea dependencias; controladores/handlers no instancian infraestructura.

## Reglas de implementación
- Naming de archivos y carpetas: `kebab-case`.
- Commands y queries separados cuando aporta claridad.
- Validación de entrada en HTTP (`schemas`), no en repositorios.
- Errores de negocio tipados; evitar `Error("CODE")` ad hoc.
- Side effects por puertos inyectados (mailer/notifier/outbox).

## Base de datos
- Fuente de verdad: `db/migrations/`.
- Bootstrap Docker mínimo (extensiones/roles si aplica), sin tablas de negocio.
- Evitar lógica funcional basada solo en traducir errores SQL; preferir reglas explícitas en aplicación/dominio.

## Calidad obligatoria antes de cerrar bloque
- `npm -w backend run lint`
- `npm -w backend run lint:types`
- `npm -w backend run build`
- `npm -w backend run test`

## Flujo de trabajo
- Rama activa de integración: `next`.
- Commits en inglés, pequeños y temáticos.
- No mezclar en un mismo commit: refactor estructural + funcionalidad nueva.
- Actualizar docs afectadas en el mismo bloque (`TASKS`, `ARCHITECTURE`, `CHANGELOG` si aplica).

## Checklist rápido de revisión
- ¿Hay imports ilegales entre capas?
- ¿El cambio mantiene contratos HTTP?
- ¿Los tests cubren caso feliz y errores relevantes?
- ¿Se actualizó documentación de seguimiento?
- ¿Se validó calidad con los 4 comandos?
