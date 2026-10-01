"""orders.assigned_producer_id FK + drop unused schedule_entries

Revision ID: c6d7e8f9a0b1
Revises: b5c6d7e8f9a0
Create Date: 2026-10-01 18:00:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "c6d7e8f9a0b1"
down_revision: Union[str, Sequence[str], None] = "b5c6d7e8f9a0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE orders
          ADD COLUMN IF NOT EXISTS assigned_producer_id UUID
          REFERENCES producers(id) ON DELETE SET NULL
        """
    )
    op.execute(
        """
        UPDATE orders o
        SET assigned_producer_id = p.id
        FROM producers p
        WHERE o.assigned_producer_id IS NULL
          AND o.assigned_producer IS NOT NULL
          AND upper(trim(o.assigned_producer)) = upper(trim(p.initials))
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_orders_assigned_producer_id ON orders (assigned_producer_id)"
    )
    op.execute("DROP TABLE IF EXISTS schedule_entries CASCADE")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_orders_assigned_producer_id")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS assigned_producer_id")
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS schedule_entries (
          id UUID PRIMARY KEY,
          producer_id UUID REFERENCES producers(id) ON DELETE CASCADE,
          producer_initials VARCHAR NOT NULL,
          day VARCHAR NOT NULL,
          status VARCHAR NOT NULL,
          count INTEGER NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
