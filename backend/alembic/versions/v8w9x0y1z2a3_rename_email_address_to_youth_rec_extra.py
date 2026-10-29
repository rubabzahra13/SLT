"""rename email_address to youth_rec_extra_email_address

Youth Rec Magento second email field: not coach email.

Revision ID: v8w9x0y1z2a3
Revises: u7v8w9x0y1z2
Create Date: 2026-10-15 00:07:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "v8w9x0y1z2a3"
down_revision: Union[str, Sequence[str], None] = "u7v8w9x0y1z2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE orders
        RENAME COLUMN email_address TO youth_rec_extra_email_address
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE orders
        RENAME COLUMN youth_rec_extra_email_address TO email_address
        """
    )
