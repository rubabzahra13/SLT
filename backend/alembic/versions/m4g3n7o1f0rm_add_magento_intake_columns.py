"""add Magento intake columns on orders

All Star Cheer address line 2 is its own column.
magento_result_id is the unique submission key (not the order UUID).

Revision ID: m4g3n7o1f0rm
Revises: n7o8p9q0r1s2
Create Date: 2026-11-03 08:50:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "m4g3n7o1f0rm"
down_revision: Union[str, Sequence[str], None] = "n7o8p9q0r1s2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS school_gym_billing_address_line_2 TEXT
        """
    )
    op.execute(
        """
        ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS magento_form_id VARCHAR
        """
    )
    op.execute(
        """
        ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS magento_result_id VARCHAR
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_magento_result_id
        ON orders (magento_result_id)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_orders_magento_form_id
        ON orders (magento_form_id)
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_orders_magento_form_id")
    op.execute("DROP INDEX IF EXISTS uq_orders_magento_result_id")
    op.execute(
        "ALTER TABLE orders DROP COLUMN IF EXISTS magento_result_id"
    )
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS magento_form_id")
    op.execute(
        "ALTER TABLE orders DROP COLUMN IF EXISTS school_gym_billing_address_line_2"
    )
