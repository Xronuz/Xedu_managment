#!/usr/bin/env bash
set -euo pipefail

# ── Config ───────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="/backups"
TIMESTAMP="$(date +%Y-%m-%d_%H-%M)"
FILENAME="xedu_${TIMESTAMP}.sql.gz"

# ── Error handler ────────────────────────────────────────────────────────────
trap 'echo "Backup FAILED: ${BASH_COMMAND} failed with exit code $?" >&2; exit 1' ERR

# ── Find .env ────────────────────────────────────────────────────────────────
ENV_FILE="${SCRIPT_DIR}/../../.env"
if [[ ! -f "$ENV_FILE" ]]; then
  ENV_FILE="${SCRIPT_DIR}/../.env"
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Backup FAILED: .env file not found" >&2
  exit 1
fi

# ── Read DATABASE_URL ────────────────────────────────────────────────────────
if [[ -n "${DATABASE_URL:-}" ]]; then
  DB_URL="$DATABASE_URL"
else
  DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | cut -d= -f2- | sed 's/^["'"'"']//;s/["'"'"']$//')"
  DB_URL="$DATABASE_URL"
fi

if [[ -z "$DB_URL" ]]; then
  echo "Backup FAILED: DATABASE_URL not found" >&2
  exit 1
fi

# ── Ensure backup directory ──────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"

# ── Dump & compress ──────────────────────────────────────────────────────────
pg_dump "$DB_URL" | gzip > "${BACKUP_DIR}/${FILENAME}"

# ── Retention: keep last 7 days ──────────────────────────────────────────────
find "$BACKUP_DIR" -name 'xedu_*.sql.gz' -mtime +7 -delete

# ── Success ──────────────────────────────────────────────────────────────────
echo "Backup OK: ${FILENAME}"
