"""merge viroc_choreographer_email into choreographer_email

V!ROC Magento "V!ROC Choreographer Email" is the same contact
as "Choreographer Email" on other forms — one SoT column.

Revision ID: z2a3b4c5d6e7
Revises: y1z2a3b4c5d6
Create Date: 2026-10-15 02:36:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "z2a3b4c5d6e7"
down_revision: Union[str, Sequence[str], None] = "y1z2a3b4c5d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE orders
        SET choreographer_email = COALESCE(
              NULLIF(TRIM(choreographer_email), ''),
              NULLIF(TRIM(viroc_choreographer_email), '')
            )
        WHERE NULLIF(TRIM(viroc_choreographer_email), '') IS NOT NULL
        """
    )
    op.execute(
        "ALTER TABLE orders DROP COLUMN IF EXISTS viroc_choreographer_email"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS viroc_choreographer_email VARCHAR"
    )
    op.execute(
        """
        UPDATE orders
        SET viroc_choreographer_email = choreographer_email
        """
    )
