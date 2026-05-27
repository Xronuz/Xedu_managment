#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Cloudflare 522 Diagnostic Script
# Run this on the production server as root or with docker privileges
# ═══════════════════════════════════════════════════════════════════════════════

set -e

COMPOSE_FILE="/opt/eduplatform/docker-compose.selfhost.yml"
APP_DIR="/opt/eduplatform"

echo "══════════════════════════════════════════════════════════════════"
echo "  Xedu CF-522 Diagnostic — $(date)"
echo "══════════════════════════════════════════════════════════════════"
echo ""

# ── 1. Git Status ────────────────────────────────────────────────────────────
echo "=== 1. GIT STATUS ==="
cd "$APP_DIR" && git log --oneline -3 || echo "  ERROR: cannot read git status"
echo ""

# ── 2. Container Status ──────────────────────────────────────────────────────
echo "=== 2. CONTAINERS ==="
docker compose -f "$COMPOSE_FILE" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "  ERROR: docker compose ps failed"
echo ""

# ── 3. Backend Logs (last 100 lines) ─────────────────────────────────────────
echo "=== 3. BACKEND LOGS (last 100) ==="
docker compose -f "$COMPOSE_FILE" logs --tail=100 backend 2>/dev/null || echo "  ERROR: cannot read backend logs"
echo ""

# ── 4. Frontend Logs (last 50 lines) ─────────────────────────────────────────
echo "=== 4. FRONTEND LOGS (last 50) ==="
docker compose -f "$COMPOSE_FILE" logs --tail=50 frontend 2>/dev/null || echo "  ERROR: cannot read frontend logs"
echo ""

# ── 5. Caddy / Reverse Proxy Logs ────────────────────────────────────────────
echo "=== 5. CADDY LOGS (last 50) ==="
docker compose -f "$COMPOSE_FILE" logs --tail=50 caddy 2>/dev/null || echo "  ERROR: cannot read caddy logs"
echo ""

# ── 6. Migrate Logs ──────────────────────────────────────────────────────────
echo "=== 6. MIGRATE LOGS (last 50) ==="
docker compose -f "$COMPOSE_FILE" logs --tail=50 migrate 2>/dev/null || echo "  ERROR: cannot read migrate logs"
echo ""

# ── 7. Port Bindings ─────────────────────────────────────────────────────────
echo "=== 7. PORTS ==="
ss -tulpn 2>/dev/null | grep -E ':80|:443|:3000|:3001' || echo "  No matching ports found"
echo ""

# ── 8. Local Health Checks ───────────────────────────────────────────────────
echo "=== 8. LOCAL HEALTH CHECKS ==="

echo "  → curl http://localhost:3001/api/health"
curl -sf -o /dev/null -w "  HTTP %{http_code} (%{time_total}s)\n" \
  http://localhost:3001/api/health 2>/dev/null || echo "  FAILED (connection refused/timeout)"

echo "  → curl http://localhost:3000"
curl -sf -o /dev/null -w "  HTTP %{http_code} (%{time_total}s)\n" \
  http://localhost:3000 2>/dev/null || echo "  FAILED (connection refused/timeout)"

echo "  → curl http://localhost (nginx/Caddy)"
curl -sf -o /dev/null -w "  HTTP %{http_code} (%{time_total}s)\n" \
  http://localhost 2>/dev/null || echo "  FAILED (connection refused/timeout)"
echo ""

# ── 9. Nginx Status ──────────────────────────────────────────────────────────
echo "=== 9. NGINX ==="
nginx -t 2>/dev/null && echo "  Config: OK" || echo "  Config: FAILED"
systemctl is-active nginx 2>/dev/null && echo "  Service: ACTIVE" || echo "  Service: INACTIVE/NOT FOUND"
echo ""

# ── 10. Disk / Memory ────────────────────────────────────────────────────────
echo "=== 10. DISK / MEMORY ==="
echo "  Disk:"
df -h / | tail -1
echo "  Memory:"
free -h 2>/dev/null | grep -E "Mem|Swap" || echo "  free not available"
echo "  Docker:"
docker system df 2>/dev/null || echo "  docker system df failed"
echo ""

# ── 11. Migration Status ─────────────────────────────────────────────────────
echo "=== 11. PRISMA MIGRATE STATUS ==="
docker compose -f "$COMPOSE_FILE" exec -T backend npx prisma migrate status 2>/dev/null || echo "  ERROR: cannot check migration status"
echo ""

# ── 12. Recent Backend Crash/Restart Count ───────────────────────────────────
echo "=== 12. BACKEND RESTART COUNT ==="
docker inspect --format='{{.Name}} {{.State.RestartCount}} {{.State.Status}} {{.State.Health.Status}}' \
  $(docker compose -f "$COMPOSE_FILE" ps -q backend 2>/dev/null) 2>/dev/null || echo "  Cannot inspect backend container"
echo ""

# ── 13. Environment Check ────────────────────────────────────────────────────
echo "=== 13. ENV CHECK (critical vars) ==="
if [ -f "$APP_DIR/.env" ]; then
  grep -E "^JWT_SECRET=|^DATABASE_URL=|^ALLOWED_ORIGINS=|^APP_URL=" "$APP_DIR/.env" | sed 's/=.*/=***SET***/' || true
else
  echo "  .env not found!"
fi
echo ""

# ── 14. Cloudflare Origin IP Reachability ────────────────────────────────────
echo "=== 14. CLOUDFLARE ORIGIN REACHABILITY ==="
echo "  If nginx/Caddy is running on 80/443, Cloudflare should reach it."
echo "  Common CF 522 causes on this server:"
echo "    a) backend container crashed / in restart loop"
echo "    b) nginx/Caddy not running or misconfigured"
echo "    c) firewall (ufw/cloudflare) blocking origin"
echo "    d) disk full → container cannot start"
echo "    e) migration failed → backend exits immediately"
echo ""

echo "══════════════════════════════════════════════════════════════════"
echo "  Diagnostic complete — $(date)"
echo "══════════════════════════════════════════════════════════════════"
