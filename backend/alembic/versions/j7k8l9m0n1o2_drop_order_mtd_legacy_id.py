"""drop legacy_id from orders and mtd_records

Revision ID: j7k8l9m0n1o2
Revises: j6k7l8m9n0o1
Create Date: 2026-10-14 19:30:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "j7k8l9m0n1o2"
down_revision: Union[str, Sequence[str], None] = "j6k7l8m9n0o1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_orders_legacy_id")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS legacy_id")
    op.execute("DROP INDEX IF EXISTS ix_mtd_records_legacy_id")
    op.execute("ALTER TABLE mtd_records DROP COLUMN IF EXISTS legacy_id")


def downgrade() -> None:
    op.add_column(
        "mtd_records",
        sa.Column("legacy_id", sa.String(), nullable=True),
    )
    op.create_index(
        op.f("ix_mtd_records_legacy_id"),
        "mtd_records",
        ["legacy_id"],
        unique=False,
    )
    op.add_column(
        "orders",
        sa.Column("legacy_id", sa.String(), nullable=True),
    )
    op.create_index(
        op.f("ix_orders_legacy_id"),
        "orders",
        ["legacy_id"],
        unique=False,
    )
