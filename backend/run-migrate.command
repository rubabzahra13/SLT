#!/bin/bash
# Run: bash backend/run-migrate.command
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(cd .. && pwd)"

set -a
# shellcheck disable=SC1091
source "$ROOT/.env"
set +a

# Migrations need session/direct mode — do not use the transaction pooler.
DIRECT="${SUPABASE_DIRECT_CONNECTION_STRING:-}"
if [[ -z "$DIRECT" ]]; then
  DIRECT="${DATABASE_URL:-}"
fi
# If DATABASE_URL is pooler, prefer rewriting back is wrong — use direct host string.
if [[ "$DIRECT" == *"pooler.supabase.com"* ]]; then
  echo "ERROR: SUPABASE_DIRECT_CONNECTION_STRING must point at db.*.supabase.co (session/direct), not the pooler."
  exit 1
fi
case "$DIRECT" in
  *sslmode=*) ;;
  *)
    if [[ "$DIRECT" == *\?* ]]; then DIRECT="${DIRECT}&sslmode=require"
    else DIRECT="${DIRECT}?sslmode=require"; fi
    ;;
esac

export DATABASE_URL="$DIRECT"
unset RUNTIME_DATABASE_URL || true
export PYTHONPATH="$ROOT/backend"

echo "Migrating via: $(python3 -c "from urllib.parse import urlparse; import os; print(urlparse(os.environ['DATABASE_URL']).hostname)")"
"$ROOT/backend/venv/bin/python" - <<'PY'
import os
from urllib.parse import urlparse
from alembic.config import Config
from alembic import command
from app.core import config

def _direct(self):
    url = os.environ["DATABASE_URL"]
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url

config.Settings.get_database_url = _direct
# Force settings object to use patched method for env.py import path
print("DB:", urlparse(config.settings.get_database_url()).hostname)
cfg = Config("alembic.ini")
command.upgrade(cfg, "head")
print("alembic upgrade head: OK")
PY
