"""merge school_program_name into school_name

One non-gym identity column: school_name.
UI still labels it Program / School/Program / Organization by form.

Revision ID: p2q3r4s5t6u7
Revises: o1p2q3r4s5t6
Create Date: 2026-10-14 22:57:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "p2q3r4s5t6u7"
down_revision: Union[str, Sequence[str], None] = "o1p2q3r4s5t6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE orders
        SET school_name = COALESCE(
              NULLIF(TRIM(school_name), ''),
              NULLIF(TRIM(school_program_name), '')
            )
        WHERE NULLIF(TRIM(school_program_name), '') IS NOT NULL
        """
    )
    # All Star keeps gym only — clear school_name if it was wrongly filled.
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
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS school_program_name")


def downgrade() -> None:
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS school_program_name VARCHAR"
    )
    op.execute(
        """
        UPDATE orders
        SET school_program_name = school_name
        WHERE cheer_form_subtype IS DISTINCT FROM 'all-star-cheer'
          AND cheer_form_subtype IS DISTINCT FROM 'school-cheer-viroc-yes'
          AND cheer_form_subtype IS DISTINCT FROM 'school-cheer-viroc-no'
        """
    )
