# Deployment

Este documento define el enfoque de despliegue para la correccion del TFM y el futuro uso interno.

## Objetivo
- Correccion TFM: despliegue temporal y de bajo coste.
- Uso interno: se definira despues (entorno estable con controles de acceso y roles).

## Entornos
- `local`: desarrollo en maquina local con Docker.
- `correction`: despliegue temporal para la evaluacion del TFM.
- `internal`: uso interno en la empresa (pendiente de definir).

La seleccion de entorno se define por `NODE_ENV` y las variables en `backend/.env`.

## Variables clave
- `NODE_ENV`: `development`, `test`, `production`
- `DATABASE_URL`
- `JWT_SECRET`
- `ALLOWED_EMAIL_DOMAINS`
- `APP_BASE_URL`
- `CORS_ORIGINS`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

## Migraciones y seeds
- Ejecutar `npm run db:migrate` en cada despliegue.
- Ejecutar `npm run db:seed:correction` solo para la correccion TFM.

## Despliegue gratuito (correction)
Opciones previstas (por definir la elegida):
- Hosting API: Render, Railway, Fly.io
- Base de datos: proveedor Postgres con plan gratuito
- SMTP: proveedor con plan gratuito (o SMTP corporativo si aplica)

Notas:
- El entorno de correccion no debe reutilizar credenciales internas.
- No se habilita acceso de administracion ni roles avanzados en esta fase.

## SMTP
- Local: Mailpit (docker-compose).
- Correction: SMTP gratuito o corporativo (pendiente de seleccionar proveedor).

## CI
- GitHub Actions ejecuta test + build en `main` y `next`.
