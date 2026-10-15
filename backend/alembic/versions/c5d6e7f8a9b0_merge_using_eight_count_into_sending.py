"""merge using_eight_count_sheets into sending_eight_count_sheets

Magento "sending" / "using" 8-count sheets is one Yes/No preference.
Keep sending_eight_count_sheets as SoT; fold using into it.

Revision ID: c5d6e7f8a9b0
Revises: b4c5d6e7f8a9
Create Date: 2026-10-15 15:26:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "c5d6e7f8a9b0"
down_revision: Union[str, Sequence[str], None] = "b4c5d6e7f8a9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE orders
        SET sending_eight_count_sheets = COALESCE(
              NULLIF(TRIM(sending_eight_count_sheets), ''),
              NULLIF(TRIM(using_eight_count_sheets), '')
            )
        WHERE NULLIF(TRIM(using_eight_count_sheets), '') IS NOT NULL
        """
    )
    op.execute(
        "ALTER TABLE orders DROP COLUMN IF EXISTS using_eight_count_sheets"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS using_eight_count_sheets VARCHAR"
    )
    op.execute(
        """
        UPDATE orders
        SET using_eight_count_sheets = sending_eight_count_sheets
        """
    )
