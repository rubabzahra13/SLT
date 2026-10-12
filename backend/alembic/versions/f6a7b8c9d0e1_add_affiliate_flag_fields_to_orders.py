"""add affiliate flag fields to orders

Revision ID: f6a7b8c9d0e1
Revises: e4f5a6b7c8d9
Create Date: 2026-10-13 00:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f6a7b8c9d0e1"
down_revision: Union[str, Sequence[str], None] = "e4f5a6b7c8d9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS affiliate_flag_status "
        "VARCHAR NULL;"
    )
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS music_affiliate_selections "
        "TEXT NULL;"
    )


def downgrade() -> None:
    op.drop_column("orders", "music_affiliate_selections")
    op.drop_column("orders", "affiliate_flag_status")
