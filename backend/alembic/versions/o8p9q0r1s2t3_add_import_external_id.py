"""add unique import_external_id on orders

Revision ID: o8p9q0r1s2t3
Revises: n7o8p9q0r1s2
Create Date: 2026-11-03 00:10:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "o8p9q0r1s2t3"
down_revision: Union[str, Sequence[str], None] = "n7o8p9q0r1s2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS import_external_id VARCHAR
        """
    )
    # Backfill from legacy attention_reason markers written by early import.
    op.execute(
        """
        UPDATE orders
        SET import_external_id = SUBSTRING(
            attention_reason
            FROM 'import_external_id:([^\\s]+)'
        )
        WHERE import_external_id IS NULL
          AND attention_reason LIKE '%import_external_id:%'
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS ix_orders_import_external_id
        ON orders (import_external_id)
        WHERE import_external_id IS NOT NULL
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_orders_import_external_id")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS import_external_id")
