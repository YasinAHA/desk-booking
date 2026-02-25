## Summary
- Scope:
- Why:
- Risk:

## Validation
- [ ] `npm -w backend run lint`
- [ ] `npm -w backend run lint:architecture`
- [ ] `npm -w backend run lint:types`
- [ ] `npm -w backend run test`
- [ ] `npm -w backend run build`

## AI Compliance Checklist
- [ ] Código generado/revisado siguiendo `docs/frontend/ai/LLM-GENERATE.md` o plantilla equivalente del área.
- [ ] Auditoría realizada con `docs/frontend/ai/LLM-AUDIT.md` cuando aplica.
- [ ] No se modificaron archivos OpenAPI generados manualmente.
- [ ] No se introdujeron dependencias nuevas sin documentar decisión.
- [ ] No hay lógica de negocio en UI.
- [ ] No hay `fetch` directo en componentes UI.
- [ ] Contrato OpenAPI sin drift (tipos/regeneración/documentación coherente).
- [ ] Quality gates en verde (lint/type/test/build; e2e cuando aplique).

## Docs
- [ ] Actualicé documentación afectada (`README`, `docs/*`) o no aplica.

