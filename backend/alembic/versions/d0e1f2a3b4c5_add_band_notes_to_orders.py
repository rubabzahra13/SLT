"""add instrumentation and lyrical notes to orders

Revision ID: d0e1f2a3b4c5
Revises: c9d0e1f2a3b4
Create Date: 2026-10-13 01:12:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d0e1f2a3b4c5"
down_revision: Union[str, Sequence[str], None] = "c9d0e1f2a3b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS instrumentation_notes "
        "TEXT NULL;"
    )
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS lyrical_notes "
        "TEXT NULL;"
    )


def downgrade() -> None:
    op.drop_column("orders", "lyrical_notes")
    op.drop_column("orders", "instrumentation_notes")
