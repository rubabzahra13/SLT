"""Youth Rec Magento contact-phone (field 69) on its own column.

Revision ID: y0u7h3cph0n3
Revises: m4g3n7o1f0rm
Create Date: 2026-11-03 10:05:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "y0u7h3cph0n3"
down_revision: Union[str, Sequence[str], None] = "m4g3n7o1f0rm"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS contact_phone_for_youth_rec_cheer VARCHAR
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS magento_poll_cursor (
            id INTEGER PRIMARY KEY,
            import_after TIMESTAMPTZ NOT NULL
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS magento_poll_cursor")
    op.execute(
        "ALTER TABLE orders DROP COLUMN IF EXISTS contact_phone_for_youth_rec_cheer"
    )
