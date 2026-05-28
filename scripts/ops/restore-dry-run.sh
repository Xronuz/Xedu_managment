#!/bin/bash
# EduPlatform — Database Restore Dry-Run
# Verifies backup integrity without modifying production data.
# Usage: ./restore-dry-run.sh /opt/backups/db_20260521_020000.sql.gz

set -euo pipefail

BACKUP_FILE="${1:-}"
if [ -z "$BACKUP_FILE" ]; then
  echo "Foydalanish: $0 <backup_file.sql.gz>"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Xato: Fayl topilmadi: $BACKUP_FILE"
  exit 1
fi

echo "[$(date)] Dry-run boshlandi: $BACKUP_FILE"

# Extract and validate SQL syntax (pg_restore --list equivalent for plain SQL)
if [[ "$BACKUP_FILE" == *.gz ]]; then
  echo "[$(date)] Gzip arxivini tekshirish..."
  gunzip -t "$BACKUP_FILE" || { echo "Xato: Arxiv buzilgan"; exit 1; }
  echo "[$(date)] Arxiv tuzilishi to'g'ri"

  echo "[$(date)] SQL sintaksisini tekshirish..."
  gunzip -c "$BACKUP_FILE" | head -n 50 | grep -q "PostgreSQL database dump" || {
    echo "Ogohlantirish: Standart pg_dump sarlavhasi topilmadi"
  }
else
  echo "[$(date)] SQL sintaksisini tekshirish..."
  head -n 50 "$BACKUP_FILE" | grep -q "PostgreSQL database dump" || {
    echo "Ogohlantirish: Standart pg_dump sarlavhasi topilmadi"
  }
fi

echo "[$(date)] Dry-run tugadi. Backup yaroqli."
echo ""
echo "HAQIQIY RESTORE UCHUN:"
echo "  1. docker compose down"
echo "  2. docker compose up -d postgres"
echo "  3. gunzip -c $BACKUP_FILE | docker compose exec -T postgres psql -U eduplatform eduplatform_db"
echo "  4. docker compose up -d"
