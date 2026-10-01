#!/bin/zsh
cd /Users/rubabzahra/tryslt/backend || exit 1
set -a
source /Users/rubabzahra/tryslt/.env
set +a
export PYTHONPATH=/Users/rubabzahra/tryslt/backend
echo "Seeding demo data into Supabase..."
/Users/rubabzahra/tryslt/backend/venv/bin/python -m app.seed.seed_data
echo
echo "Exit code: $?"
echo "Press Enter to close..."
read
