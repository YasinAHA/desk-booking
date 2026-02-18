# AI Guide Frontend

Guía operativa para cambios de frontend.

## Alcance
- UI, experiencia de usuario y consumo de API.
- Organización de archivos y consistencia visual/funcional.

## Fuentes de verdad
- [../AI-GUIDE.md](../AI-GUIDE.md)
- [../backend/API.md](../backend/API.md)
- [../ARCHITECTURE.md](../ARCHITECTURE.md)
- [README.md](README.md)

## Reglas base
- Respetar contratos de API backend (payloads, códigos y mensajes esperados).
- No mover lógica de negocio crítica al frontend.
- Gestionar explícitamente estados de carga, error y éxito.
- Mantener naming consistente (`kebab-case` para archivos/estilos).
- Evitar dependencias innecesarias mientras no exista arquitectura frontend formal cerrada.

## Seguridad y UX
- No exponer secretos en cliente.
- Tratar errores de auth con mensajes claros pero sin filtrar información sensible.
- Mantener consistencia de mensajes con la política anti-enumeración definida en backend.

## Calidad mínima antes de cerrar bloque frontend
- Verificar manualmente flujos principales en local.
- Confirmar compatibilidad con endpoints actuales documentados.
- Actualizar documentación si cambia comportamiento visible.

## Nota de evolución
- Pendiente definir arquitectura frontend objetivo (módulos, estado y testing) en una versión posterior.
