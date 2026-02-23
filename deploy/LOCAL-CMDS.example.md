# Local Deploy Commands (Example)

Copy this file to `deploy/LOCAL-CMDS.md` for your real/local notes.
`deploy/LOCAL-CMDS.md` is ignored by git.

## VPS clean deploy (branch `next`)

```bash
cd /opt
git clone -b next https://github.com/YasinAHA/desk-booking.git desk-booking
cd desk-booking
```

## Configure env

```bash
cp deploy/.env.example deploy/.env
cp deploy/env/backend.env.example deploy/.env.backend
cp deploy/env/frontend.env.example deploy/.env.frontend
nano deploy/.env
nano deploy/.env.backend
nano deploy/.env.frontend
```

## Build and start

```bash
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d --build
```

## Initialize database

```bash
sh deploy/scripts/init-db.sh correction
sh deploy/scripts/init-db.sh evaluator_users
```

## Smoke checks

```bash
curl -i https://deskbooking-yasin.duckdns.org/health
curl -i -X POST https://deskbooking-yasin.duckdns.org/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@camerfirma.com","password":"Password#2026Segura","firstName":"Usuario","lastName":"Demo"}'
```
