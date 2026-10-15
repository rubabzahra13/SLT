"""merge gym_name into school_name

One place/program/gym identity column: school_name.
UI still labels it Gym / School / Program / Org by form
(same idea as POM School/Gym Address).

Revision ID: q3r4s5t6u7v8
Revises: p2q3r4s5t6u7
Create Date: 2026-10-14 23:05:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "q3r4s5t6u7v8"
down_revision: Union[str, Sequence[str], None] = "p2q3r4s5t6u7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE orders
        SET school_name = COALESCE(
              NULLIF(TRIM(school_name), ''),
              NULLIF(TRIM(gym_name), '')
            )
        WHERE NULLIF(TRIM(gym_name), '') IS NOT NULL
        """
    )
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS gym_name")


def downgrade() -> None:
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS gym_name VARCHAR")
    op.execute(
        """
        UPDATE orders
        SET gym_name = school_name
        WHERE cheer_form_subtype = 'all-star-cheer'
           OR (
                form_type = 'school-all-star-cheer'
                AND cheer_form_subtype IS NULL
              )
        """
    )
    op.execute(
        """
        UPDATE orders
        SET school_name = NULL
        WHERE cheer_form_subtype = 'all-star-cheer'
           OR (
                form_type = 'school-all-star-cheer'
                AND cheer_form_subtype IS NULL
              )
        """
    )
