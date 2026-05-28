#!/bin/bash
# EduPlatform — Database Backup Script
# Usage: ./backup.sh [backup_dir]

set -euo pipefail

BACKUP_DIR="${1:-/opt/backups}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db_${DATE}.sql"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Backup boshlandi: $BACKUP_FILE"

# Detect compose file
COMPOSE_FILE="docker-compose.selfhost.yml"
if [ -f "/opt/eduplatform/docker-compose.prod.yml" ]; then
  COMPOSE_FILE="docker-compose.prod.yml"
fi

cd /opt/eduplatform || exit 1

docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U eduplatform eduplatform_db \
  > "$BACKUP_FILE"

# Compress
gzip -f "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"

# Retain last 14 days
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +14 -delete

echo "[$(date)] Backup tugadi: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"
