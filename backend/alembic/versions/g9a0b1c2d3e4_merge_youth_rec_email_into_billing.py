"""merge youth_rec_extra_email_address into billing_person_email

Youth Rec Magento "Email Address" is the same contact email as
"Billing Person Email" on other forms — one SoT column.

Revision ID: g9a0b1c2d3e4
Revises: f8a9b0c1d2e3, p5a6b7c8d9e0
Create Date: 2026-10-20 14:10:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "g9a0b1c2d3e4"
down_revision: Union[str, Sequence[str], None] = ("f8a9b0c1d2e3", "p5a6b7c8d9e0")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE orders
        SET billing_person_email = COALESCE(
              NULLIF(TRIM(billing_person_email), ''),
              NULLIF(TRIM(youth_rec_extra_email_address), '')
            )
        WHERE NULLIF(TRIM(youth_rec_extra_email_address), '') IS NOT NULL
        """
    )
    op.execute(
        "ALTER TABLE orders DROP COLUMN IF EXISTS youth_rec_extra_email_address"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS "
        "youth_rec_extra_email_address VARCHAR"
    )
    op.execute(
        """
        UPDATE orders
        SET youth_rec_extra_email_address = billing_person_email
        """
    )
