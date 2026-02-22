# Frontend Redesign Plan (v0.8.x -> v0.9.x)

## Objetivo
Integrar el diseño de referencia de `temp/frontend-example` en el frontend real, manteniendo arquitectura feature-first, contratos API existentes y quality gates en verde.

## Principios
- No copiar "tal cual" el ejemplo: adoptar look & feel, no mocks.
- Mantener una sola fuente de verdad de estilos (tokens + primitives).
- Evitar sobrecarga de dependencias: incorporar solo lo necesario.
- Cualquier dato visible debe venir de backend real o estar marcado como placeholder temporal.

## Fases

### Fase 1 - Fundacion visual
- Consolidar tokens de diseño (color, tipografia, radios, sombras, spacing).
- Consolidar primitives (`Button`, `Card`, `Input`, `Badge`, `Alert`, `Toast`, `Dialog`).
- Implementar shell visual base (sidebar + area principal) responsive.

**Salida:** base visual moderna sin cambiar logica funcional.

### Fase 2 - Navegacion y rutas reales
- Adaptar menu/sidebar a rutas reales:
  - `/desks`
  - `/reservations`
  - `/check-in`
  - `/admin/desks` (segun permiso)
- Ocultar items no existentes en producto (sin Team/Settings fake).
- Mantener guards y UX de acceso denegado.

**Salida:** estructura de navegacion consistente con producto real.

### Fase 3 - Vistas funcionales con nuevo look
- Migrar `desks`, `reservations`, `admin-qr`, `check-in`, `login` al nuevo estilo.
- Reducir clases repetidas y usar patrones semanticos reutilizables.
- Mantener comportamiento actual (reservar, cancelar, regenerar, imprimir, check-in).

**Salida:** UI integrada sin regresion funcional.

### Fase 4 - Dashboard real
- Crear dashboard visual inspirado en ejemplo, con datos reales (no mock).
- Tarjetas metricas conectadas a API.
- Estado vacio y fallback claros cuando falte dato.

**Salida:** dashboard listo para demo con datos de entorno real.

### Fase 5 - Mapa de oficina evolutivo
- V1: grid de desks reales por estado.
- V2: zonas/espacios (cocina, salas, etc.) cuando backend lo soporte.

**Salida:** visual operativo hoy, extensible para modelo futuro.

## Riesgos y mitigaciones
- Drift visual: forzar consumo de primitives y tokens.
- Deuda por dependencias UI: introducir por necesidad, no masivamente.
- Regresiones funcionales: pruebas por flujo critico en cada fase.
- Encoding: mantener archivos en UTF-8.

## Quality gates por fase
- `npm -w frontend run lint` OK
- `npm -w frontend run typecheck` OK
- `npm -w frontend run test` OK

## Fuera de alcance inmediato
- Copia completa del set de componentes `ui/*` del ejemplo.
- Nuevas features de negocio no previstas en scope (roles avanzados, settings, etc.).

