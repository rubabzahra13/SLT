#!/bin/bash
# Keep only the 5 Greek Demo Coach orders. Run in your own Terminal (needs Supabase DNS).
# Usage: bash backend/run-cleanup.command
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(cd .. && pwd)"

set -a
# shellcheck disable=SC1091
source "$ROOT/.env"
set +a

DIRECT="${SUPABASE_DIRECT_CONNECTION_STRING:-}"
if [[ -z "$DIRECT" ]]; then
  echo "ERROR: SUPABASE_DIRECT_CONNECTION_STRING is not set in .env"
  exit 1
fi
if [[ "$DIRECT" == *"pooler.supabase.com"* ]]; then
  echo "ERROR: SUPABASE_DIRECT_CONNECTION_STRING must point at db.*.supabase.co, not the pooler."
  exit 1
fi
case "$DIRECT" in
  *sslmode=*) ;;
  *)
    if [[ "$DIRECT" == *\?* ]]; then DIRECT="${DIRECT}&sslmode=require"
    else DIRECT="${DIRECT}?sslmode=require"; fi
    ;;
esac

export SUPABASE_DIRECT_CONNECTION_STRING="$DIRECT"
unset RUNTIME_DATABASE_URL || true
export PYTHONPATH="$ROOT/backend"

echo "Cleanup via: $(python3 -c "from urllib.parse import urlparse; import os; print(urlparse(os.environ['SUPABASE_DIRECT_CONNECTION_STRING']).hostname)")"
"$ROOT/backend/venv/bin/python" "$ROOT/backend/scripts/keep_demo_orders.py"
