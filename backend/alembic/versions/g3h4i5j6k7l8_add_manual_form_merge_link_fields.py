"""add manual/form merge link fields to orders

Revision ID: g3h4i5j6k7l8
Revises: f2a3b4c5d6e7
Create Date: 2026-10-13 01:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "g3h4i5j6k7l8"
down_revision: Union[str, Sequence[str], None] = "f2a3b4c5d6e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS "
        "merged_form_order_id VARCHAR NULL;"
    )
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS "
        "merged_into_manual_order_id VARCHAR NULL;"
    )
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS "
        "manual_overlap_snapshot JSON NULL;"
    )


def downgrade() -> None:
    op.drop_column("orders", "manual_overlap_snapshot")
    op.drop_column("orders", "merged_into_manual_order_id")
    op.drop_column("orders", "merged_form_order_id")
