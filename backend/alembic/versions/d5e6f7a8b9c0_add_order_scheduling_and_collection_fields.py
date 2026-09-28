"""add_order_scheduling_and_collection_fields

Revision ID: d5e6f7a8b9c0
Revises: c3d4e5f6a7b8
Create Date: 2026-09-28 23:25:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "d5e6f7a8b9c0"
down_revision: Union[str, Sequence[str], None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_producer VARCHAR;")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS mix_start_date VARCHAR;")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS mix_end_date VARCHAR;")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS eight_count_sheet VARCHAR;")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS have_songs VARCHAR;")

def downgrade() -> None:
    op.drop_column("orders", "assigned_producer")
    op.drop_column("orders", "mix_start_date")
    op.drop_column("orders", "mix_end_date")
    op.drop_column("orders", "eight_count_sheet")
    op.drop_column("orders", "have_songs")
