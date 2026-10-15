"""add client_requested_rush_order

Sports Ent Magento rush Yes/No is client info —
must not overwrite admin is_rush_order (board Rush order).

Revision ID: x0y1z2a3b4c5
Revises: w9x0y1z2a3b4
Create Date: 2026-10-15 01:01:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "x0y1z2a3b4c5"
down_revision: Union[str, Sequence[str], None] = "w9x0y1z2a3b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS client_requested_rush_order VARCHAR
        """
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE orders DROP COLUMN IF EXISTS client_requested_rush_order"
    )
