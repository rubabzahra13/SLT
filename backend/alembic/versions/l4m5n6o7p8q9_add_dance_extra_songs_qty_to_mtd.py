"""add dance extra songs qty columns to mtd_records

Dance board toggles Extra Songs ($15) and Extra Song Editing Time ($30)
must persist for Complete-to-Payroll and Send Statements — previously
frontend-only and lost on refresh.

Revision ID: l4m5n6o7p8q9
Revises: k3l4m5n6o7p8
Create Date: 2026-10-29 20:15:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "l4m5n6o7p8q9"
down_revision: Union[str, Sequence[str], None] = "k3l4m5n6o7p8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE mtd_records "
        "ADD COLUMN IF NOT EXISTS extra_songs_quantity INTEGER NOT NULL DEFAULT 0"
    )
    op.execute(
        "ALTER TABLE mtd_records "
        "ADD COLUMN IF NOT EXISTS extra_song_editing_time_quantity "
        "INTEGER NOT NULL DEFAULT 0"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE mtd_records DROP COLUMN IF EXISTS extra_songs_quantity"
    )
    op.execute(
        "ALTER TABLE mtd_records "
        "DROP COLUMN IF EXISTS extra_song_editing_time_quantity"
    )
