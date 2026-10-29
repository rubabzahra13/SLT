"""add client_requested_mix_due_date

Sports Ent Magento "14 days turn around" date is client info -
must not overwrite admin mix_end_date (Mix Due Date / Assign).

Revision ID: w9x0y1z2a3b4
Revises: v8w9x0y1z2a3
Create Date: 2026-10-15 00:58:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "w9x0y1z2a3b4"
down_revision: Union[str, Sequence[str], None] = "v8w9x0y1z2a3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS client_requested_mix_due_date VARCHAR
        """
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE orders DROP COLUMN IF EXISTS client_requested_mix_due_date"
    )
