#!/bin/bash
# Fix stuck Loading orders: kill zombie API/Next processes and restart cleanly.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Stopping old servers on 3000 / 8001 / 8010 / 8011"
for port in 3000 8001 8010 8011; do
  lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | xargs kill -9 2>/dev/null || true
done
pkill -9 -f 'uvicorn app.main:app' 2>/dev/null || true
pkill -9 -f 'next dev' 2>/dev/null || true
pkill -9 -f 'scripts/dev.mjs' 2>/dev/null || true
sleep 1

echo "==> Starting FastAPI on :8001 (pooler DB URL from .env)"
cd "$ROOT/backend"
set -a
# shellcheck disable=SC1091
source "$ROOT/.env"
set +a
unset RUNTIME_DATABASE_URL || true
export PYTHONPATH="$ROOT/backend"
"$ROOT/backend/venv/bin/python" -c "from urllib.parse import urlparse; from app.core.config import settings; u=settings.get_runtime_database_url(); print('DB:', urlparse(u).hostname, urlparse(u).port)"
"$ROOT/backend/venv/bin/python" -m uvicorn app.main:app --reload --port 8001 --host 127.0.0.1 &
API_PID=$!
sleep 3

echo "==> Health check"
if ! curl -sf -m 10 "http://127.0.0.1:8001/api/health"; then
  echo
  echo "WARNING: /api/health failed — check DB/network, then retry."
else
  echo
fi

echo "==> Starting Next.js on :3000"
cd "$ROOT"
npm run dev &
WEB_PID=$!
sleep 4

echo
echo "Done."
echo "  Admin:  http://localhost:3000/orders"
echo "  API:    http://127.0.0.1:8001/api/health"
echo "  PIDs:   api=$API_PID web=$WEB_PID"
echo "Hard-refresh the browser (Cmd+Shift+R)."
wait
