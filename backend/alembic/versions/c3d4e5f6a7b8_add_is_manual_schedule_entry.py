"""add_is_manual_schedule_entry_to_mtd_records

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-09-23 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, Sequence[str], None] = ("b2c3d4e5f6a7", "c1d2e3f4a5b6")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE mtd_records ADD COLUMN IF NOT EXISTS is_manual_schedule_entry BOOLEAN NOT NULL DEFAULT false;")


def downgrade() -> None:
    op.drop_column("mtd_records", "is_manual_schedule_entry")
