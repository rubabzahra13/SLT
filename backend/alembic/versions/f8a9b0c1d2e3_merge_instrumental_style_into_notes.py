"""merge instrumental_style_preference into instrumentation_notes

Marching Band "instrumentation notes" and School Anthem "instrumental
style preference" are one Magento preference — keep instrumentation_notes.

Revision ID: f8a9b0c1d2e3
Revises: e7f8a9b0c1d2
Create Date: 2026-10-15 22:07:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "f8a9b0c1d2e3"
down_revision: Union[str, Sequence[str], None] = "e7f8a9b0c1d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE orders
        SET instrumentation_notes = COALESCE(
              NULLIF(TRIM(instrumentation_notes), ''),
              NULLIF(TRIM(instrumental_style_preference), '')
            )
        WHERE NULLIF(TRIM(instrumental_style_preference), '') IS NOT NULL
        """
    )
    op.execute(
        "ALTER TABLE orders DROP COLUMN IF EXISTS instrumental_style_preference"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS instrumental_style_preference TEXT"
    )
    op.execute(
        """
        UPDATE orders
        SET instrumental_style_preference = instrumentation_notes
        """
    )
