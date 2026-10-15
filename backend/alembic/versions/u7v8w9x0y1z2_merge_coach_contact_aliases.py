"""merge coach_contact_full_name / coach_email_address aliases

coach_contact_full_name → coach_name
coach_email_address → coach_email

email_address stays (Youth Rec parent/billing email, distinct from coach).

Revision ID: u7v8w9x0y1z2
Revises: t6u7v8w9x0y1
Create Date: 2026-10-14 23:51:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "u7v8w9x0y1z2"
down_revision: Union[str, Sequence[str], None] = "t6u7v8w9x0y1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE orders
        SET coach_name = COALESCE(
              NULLIF(TRIM(coach_name), ''),
              NULLIF(TRIM(coach_contact_full_name), '')
            )
        WHERE NULLIF(TRIM(coach_contact_full_name), '') IS NOT NULL
        """
    )
    op.execute(
        """
        UPDATE orders
        SET coach_email = COALESCE(
              NULLIF(TRIM(coach_email), ''),
              NULLIF(TRIM(coach_email_address), '')
            )
        WHERE NULLIF(TRIM(coach_email_address), '') IS NOT NULL
        """
    )
    op.execute(
        "ALTER TABLE orders DROP COLUMN IF EXISTS coach_contact_full_name"
    )
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS coach_email_address")


def downgrade() -> None:
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS coach_contact_full_name VARCHAR"
    )
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS coach_email_address VARCHAR"
    )
    op.execute(
        """
        UPDATE orders
        SET coach_contact_full_name = coach_name,
            coach_email_address = coach_email
        """
    )
