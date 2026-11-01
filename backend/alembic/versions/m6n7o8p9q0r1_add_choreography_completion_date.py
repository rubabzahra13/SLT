"""add choreography_completion_date to orders

Manual New Order / edit-only date on Mix Information (Cheer, Dance, MB).
Not mapped from Magento; no scheduling or pricing logic.

Revision ID: m6n7o8p9q0r1
Revises: l4m5n6o7p8q9
Create Date: 2026-11-01 15:40:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "m6n7o8p9q0r1"
down_revision: Union[str, Sequence[str], None] = "l4m5n6o7p8q9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS choreography_completion_date VARCHAR
        """
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE orders DROP COLUMN IF EXISTS choreography_completion_date"
    )
