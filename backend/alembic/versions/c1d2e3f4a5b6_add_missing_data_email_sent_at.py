"""add_missing_data_email_sent_at_to_orders_and_mtd

Revision ID: c1d2e3f4a5b6
Revises: a90b1c2d3e4f
Create Date: 2026-09-22 15:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c1d2e3f4a5b6"
down_revision: Union[str, Sequence[str], None] = "a90b1c2d3e4f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "orders",
        sa.Column("missing_data_email_sent_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "mtd_records",
        sa.Column("missing_data_email_sent_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("mtd_records", "missing_data_email_sent_at")
    op.drop_column("orders", "missing_data_email_sent_at")
