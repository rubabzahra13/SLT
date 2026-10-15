"""merge billing/address cols into school_gym_billing_address

One address column for Gym / School / Youth Rec / Org / School/Gym Address.
UI still labels by form.

Revision ID: r4s5t6u7v8w9
Revises: q3r4s5t6u7v8
Create Date: 2026-10-14 23:20:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "r4s5t6u7v8w9"
down_revision: Union[str, Sequence[str], None] = "q3r4s5t6u7v8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS school_gym_billing_address TEXT
        """
    )
    op.execute(
        """
        UPDATE orders
        SET school_gym_billing_address = COALESCE(
              NULLIF(TRIM(school_gym_billing_address), ''),
              NULLIF(TRIM(gym_billing_address), ''),
              NULLIF(TRIM(school_billing_address), ''),
              NULLIF(TRIM(youth_rec_billing_address), ''),
              NULLIF(TRIM(organization_billing_address), ''),
              NULLIF(TRIM(school_address), '')
            )
        """
    )
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS gym_billing_address")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS school_billing_address")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS youth_rec_billing_address")
    op.execute(
        "ALTER TABLE orders DROP COLUMN IF EXISTS organization_billing_address"
    )
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS school_address")


def downgrade() -> None:
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS gym_billing_address TEXT"
    )
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS school_billing_address TEXT"
    )
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS youth_rec_billing_address TEXT"
    )
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS organization_billing_address TEXT"
    )
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS school_address TEXT")
    op.execute(
        """
        UPDATE orders
        SET school_address = school_gym_billing_address,
            gym_billing_address = school_gym_billing_address,
            school_billing_address = school_gym_billing_address,
            youth_rec_billing_address = school_gym_billing_address,
            organization_billing_address = school_gym_billing_address
        """
    )
    op.execute(
        "ALTER TABLE orders DROP COLUMN IF EXISTS school_gym_billing_address"
    )
