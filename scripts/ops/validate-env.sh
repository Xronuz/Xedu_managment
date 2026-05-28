#!/bin/bash
# EduPlatform — Environment Validation Script
# Checks required env vars, DB connectivity, Redis connectivity.

set -uo pipefail

ERRORS=0

required_vars=(
  "DATABASE_URL"
  "JWT_SECRET"
  "JWT_REFRESH_SECRET"
  "REDIS_HOST"
  "REDIS_PORT"
)

echo "=== Env o'zgaruvchilari tekshiruvi ==="
for var in "${required_vars[@]}"; do
  if [ -z "${!var:-}" ]; then
    echo "❌ $var: YO'Q"
    ((ERRORS++))
  else
    echo "✅ $var: mavjud"
  fi
done

echo ""
echo "=== Database ulanish tekshiruvi ==="
if command -v psql &> /dev/null; then
  # Extract host/port from DATABASE_URL (rough parsing)
  DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
  DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
  if [ -z "$DB_HOST" ]; then DB_HOST="localhost"; fi
  if [ -z "$DB_PORT" ]; then DB_PORT="5432"; fi

  if timeout 5 bash -c "cat < /dev/null > /dev/tcp/$DB_HOST/$DB_PORT" 2>/dev/null; then
    echo "✅ PostgreSQL ($DB_HOST:$DB_PORT) ochiq"
  else
    echo "❌ PostgreSQL ($DB_HOST:$DB_PORT) ulanmayapti"
    ((ERRORS++))
  fi
else
  echo "⚠️ psql o'rnatilmagan — DB tekshiruvi o'tkazilmadi"
fi

echo ""
echo "=== Redis ulanish tekshiruvi ==="
if command -v redis-cli &> /dev/null; then
  REDIS_PASS=$(echo "$DATABASE_URL" | sed -n 's/.*password=\([^@]*\)@.*/\1/p') # not reliable, skip
  if timeout 5 redis-cli -h "${REDIS_HOST:-localhost}" -p "${REDIS_PORT:-6379}" ping &>/dev/null; then
    echo "✅ Redis (${REDIS_HOST:-localhost}:${REDIS_PORT:-6379}) javob berdi"
  else
    echo "❌ Redis (${REDIS_HOST:-localhost}:${REDIS_PORT:-6379}) ulanmayapti"
    ((ERRORS++))
  fi
else
  echo "⚠️ redis-cli o'rnatilmagan — Redis tekshiruvi o'tkazilmadi"
fi

echo ""
echo "=== Disk tekshiruvi ==="
DISK_AVAIL=$(df / | tail -1 | awk '{print $4}')
DISK_AVAIL_MB=$((DISK_AVAIL / 1024))
if [ "$DISK_AVAIL_MB" -lt 500 ]; then
  echo "❌ Disk: ${DISK_AVAIL_MB}MB bo'sh (kamida 500MB talab qilinadi)"
  ((ERRORS++))
else
  echo "✅ Disk: ${DISK_AVAIL_MB}MB bo'sh"
fi

echo ""
if [ "$ERRORS" -eq 0 ]; then
  echo "✅ Barcha tekshiruvlar muvaffaqiyatli"
  exit 0
else
  echo "❌ $ERRORS ta xatolik topildi"
  exit 1
fi
