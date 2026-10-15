"""merge requested_producer into requested_editor

Magento "Requested Editor/Producer" is one client preference.
requested_producer was a legacy mirror — fold into requested_editor.
editor_request (FA / initials) stays separate for admin board codes.

Revision ID: a3b4c5d6e7f8
Revises: z2a3b4c5d6e7
Create Date: 2026-10-15 02:50:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "a3b4c5d6e7f8"
down_revision: Union[str, Sequence[str], None] = "z2a3b4c5d6e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE orders
        SET requested_editor = COALESCE(
              NULLIF(TRIM(requested_editor), ''),
              NULLIF(TRIM(requested_producer), '')
            )
        WHERE NULLIF(TRIM(requested_producer), '') IS NOT NULL
        """
    )
    op.execute(
        "ALTER TABLE orders DROP COLUMN IF EXISTS requested_producer"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS requested_producer VARCHAR"
    )
    op.execute(
        """
        UPDATE orders
        SET requested_producer = requested_editor
        """
    )
