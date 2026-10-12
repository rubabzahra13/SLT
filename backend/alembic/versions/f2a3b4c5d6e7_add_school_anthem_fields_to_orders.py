"""add school anthem preference fields to orders

Revision ID: f2a3b4c5d6e7
Revises: e1f2a3b4c5d6
Create Date: 2026-10-13 01:16:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f2a3b4c5d6e7"
down_revision: Union[str, Sequence[str], None] = "e1f2a3b4c5d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS nicknames TEXT NULL;")
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS vocals_preference "
        "VARCHAR NULL;"
    )
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS "
        "instrumental_style_preference TEXT NULL;"
    )


def downgrade() -> None:
    op.drop_column("orders", "instrumental_style_preference")
    op.drop_column("orders", "vocals_preference")
    op.drop_column("orders", "nicknames")
