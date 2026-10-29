"""drop legacy unused producers rate / status columns

Removes columns the current producer UI no longer reads or writes:
  default_rate, rate_overrides, manual_input_fields, notes,
  next_available, status.

Rates live in rates_by_category + dance/cheer/rush rate columns.
Next-available / status are computed at runtime from schedule.

Revision ID: k3l4m5n6o7p8
Revises: j2k3l4m5n6o7
Create Date: 2026-10-29 13:55:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "k3l4m5n6o7p8"
down_revision: Union[str, Sequence[str], None] = "j2k3l4m5n6o7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE producers DROP COLUMN IF EXISTS default_rate")
    op.execute("ALTER TABLE producers DROP COLUMN IF EXISTS rate_overrides")
    op.execute("ALTER TABLE producers DROP COLUMN IF EXISTS manual_input_fields")
    op.execute("ALTER TABLE producers DROP COLUMN IF EXISTS notes")
    op.execute("ALTER TABLE producers DROP COLUMN IF EXISTS next_available")
    op.execute("ALTER TABLE producers DROP COLUMN IF EXISTS status")


def downgrade() -> None:
    op.execute(
        "ALTER TABLE producers ADD COLUMN IF NOT EXISTS default_rate NUMERIC(5, 4)"
    )
    op.execute(
        "ALTER TABLE producers ADD COLUMN IF NOT EXISTS rate_overrides JSON"
    )
    op.execute(
        "ALTER TABLE producers ADD COLUMN IF NOT EXISTS manual_input_fields JSON"
    )
    op.execute("ALTER TABLE producers ADD COLUMN IF NOT EXISTS notes TEXT")
    op.execute(
        "ALTER TABLE producers ADD COLUMN IF NOT EXISTS next_available VARCHAR"
    )
    op.execute(
        "ALTER TABLE producers ADD COLUMN IF NOT EXISTS status VARCHAR"
    )
