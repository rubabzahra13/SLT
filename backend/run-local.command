#!/bin/bash
# Double-click or: bash backend/run-local.command
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(cd .. && pwd)"

echo "Freeing ports 8001 / 8010…"
lsof -tiTCP:8001 -sTCP:LISTEN 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -tiTCP:8010 -sTCP:LISTEN 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 1

set -a
# shellcheck disable=SC1091
source "$ROOT/.env"
set +a

# Do NOT set RUNTIME_DATABASE_URL to the direct host — config rewrites
# db.*.supabase.co → the IPv4 transaction pooler (port 6543).
unset RUNTIME_DATABASE_URL || true
export PYTHONPATH="$ROOT/backend"
PORT="${PORT:-8001}"

echo "Starting FastAPI on http://127.0.0.1:${PORT}"
"$ROOT/backend/venv/bin/python" - <<'PY'
from app.core.config import settings
from urllib.parse import urlparse
u = settings.get_runtime_database_url()
print("DB host:", urlparse(u).hostname, "port:", urlparse(u).port)
PY

exec "$ROOT/backend/venv/bin/python" -m uvicorn app.main:app --reload --port "$PORT" --host 127.0.0.1
