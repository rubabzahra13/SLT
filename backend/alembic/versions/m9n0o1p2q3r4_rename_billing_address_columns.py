"""split billing_address into form-specific columns

Revision ID: m9n0o1p2q3r4
Revises: l8m9n0o1p2q3
Create Date: 2026-10-14 21:55:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "m9n0o1p2q3r4"
down_revision: Union[str, Sequence[str], None] = "l8m9n0o1p2q3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS youth_rec_billing_address TEXT"
    )
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS organization_billing_address TEXT"
    )

    # Youth Rec Cheer
    op.execute(
        """
        UPDATE orders
        SET youth_rec_billing_address = COALESCE(
              NULLIF(TRIM(youth_rec_billing_address), ''),
              NULLIF(TRIM(billing_address), '')
            )
        WHERE cheer_form_subtype = 'youth-rec-cheer'
        """
    )

    # Sports Entertainment
    op.execute(
        """
        UPDATE orders
        SET organization_billing_address = COALESCE(
              NULLIF(TRIM(organization_billing_address), ''),
              NULLIF(TRIM(billing_address), '')
            )
        WHERE form_type = 'sports-entertainment'
        """
    )

    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS billing_address")


def downgrade() -> None:
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_address TEXT")
    op.execute(
        """
        UPDATE orders
        SET billing_address = COALESCE(
              NULLIF(TRIM(youth_rec_billing_address), ''),
              NULLIF(TRIM(organization_billing_address), '')
            )
        """
    )
    op.execute(
        "ALTER TABLE orders DROP COLUMN IF EXISTS youth_rec_billing_address"
    )
    op.execute(
        "ALTER TABLE orders DROP COLUMN IF EXISTS organization_billing_address"
    )
