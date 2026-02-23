#!/usr/bin/env sh
set -eu

BASE_URL="${1:-https://deskbooking-yasin.duckdns.org}"
TEST_EMAIL="${2:-smoke-$(date +%s)@camerfirma.com}"
TEST_PASSWORD="${3:-Password#2026Segura}"

echo "==> Smoke check against: ${BASE_URL}"

echo "==> Health check"
curl -fsS "${BASE_URL}/health" >/dev/null
echo "OK /health"

echo "==> Register check (${TEST_EMAIL})"
REGISTER_PAYLOAD=$(cat <<EOF
{"email":"${TEST_EMAIL}","password":"${TEST_PASSWORD}","firstName":"Smoke","lastName":"Check"}
EOF
)

REGISTER_RESPONSE=$(curl -fsS -X POST "${BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d "${REGISTER_PAYLOAD}")

echo "Register response: ${REGISTER_RESPONSE}"
echo "${REGISTER_RESPONSE}" | grep -q "\"ok\":true"
echo "OK /auth/register"

echo "==> Login check (${TEST_EMAIL})"
LOGIN_PAYLOAD=$(cat <<EOF
{"email":"${TEST_EMAIL}","password":"${TEST_PASSWORD}"}
EOF
)

LOGIN_RESPONSE=$(curl -fsS -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "${LOGIN_PAYLOAD}")

echo "Login response: ${LOGIN_RESPONSE}"
echo "${LOGIN_RESPONSE}" | grep -q "\"accessToken\""
echo "OK /auth/login"

echo "==> Smoke check completed successfully."
