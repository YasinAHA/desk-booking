#!/usr/bin/env sh
set -eu

COMPOSE_FILE="${COMPOSE_FILE:-deploy/docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-deploy/.env}"
SEED="${1:-correction}"

run_compose() {
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
}

echo "==> Waiting for postgres service..."
run_compose up -d postgres >/dev/null

# Basic wait loop for healthy postgres
ATTEMPTS=60
while [ "$ATTEMPTS" -gt 0 ]; do
  STATUS="$(run_compose ps --format json postgres 2>/dev/null || true)"
  echo "$STATUS" | grep -q '"Health":"healthy"' && break
  ATTEMPTS=$((ATTEMPTS - 1))
  sleep 2
done

if [ "$ATTEMPTS" -eq 0 ]; then
  echo "Postgres did not become healthy in time."
  exit 1
fi

echo "==> Applying migrations from db/migrations..."
for file in db/migrations/*.sql; do
  echo "Applying $(basename "$file")"
  cat "$file" | run_compose exec -T postgres psql -U deskbooking -d deskbooking -v ON_ERROR_STOP=1 -f -
done

if [ "$SEED" = "none" ]; then
  echo "==> Seed step skipped."
  exit 0
fi

SEED_FILE="db/seeds/${SEED}.sql"
if [ ! -f "$SEED_FILE" ]; then
  echo "Seed file not found: $SEED_FILE"
  echo "Valid options: correction | dev | test | evaluator_users | none"
  exit 1
fi

echo "==> Applying seed ${SEED_FILE}..."
cat "$SEED_FILE" | run_compose exec -T postgres psql -U deskbooking -d deskbooking -v ON_ERROR_STOP=1 -f -

echo "==> Database initialization completed."
