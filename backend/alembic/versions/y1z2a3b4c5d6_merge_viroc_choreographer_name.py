"""merge viroc_choreographer_name into choreographer_name

V!ROC Magento "V!ROC Choreographer (full name)" is the same contact
as "Choreographer (full name)" on other forms — one SoT column.

Revision ID: y1z2a3b4c5d6
Revises: x0y1z2a3b4c5
Create Date: 2026-10-15 02:30:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "y1z2a3b4c5d6"
down_revision: Union[str, Sequence[str], None] = "x0y1z2a3b4c5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE orders
        SET choreographer_name = COALESCE(
              NULLIF(TRIM(choreographer_name), ''),
              NULLIF(TRIM(viroc_choreographer_name), '')
            )
        WHERE NULLIF(TRIM(viroc_choreographer_name), '') IS NOT NULL
        """
    )
    op.execute(
        "ALTER TABLE orders DROP COLUMN IF EXISTS viroc_choreographer_name"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS viroc_choreographer_name VARCHAR"
    )
    op.execute(
        """
        UPDATE orders
        SET viroc_choreographer_name = choreographer_name
        """
    )
