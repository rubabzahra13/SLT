"""drop redundant orders.category and orders.program_name

form_type (+ subtypes) is SoT for category.
gym_name / school_name / school_program_name are SoT for identity.

Revision ID: o1p2q3r4s5t6
Revises: n0o1p2q3r4s5
Create Date: 2026-10-14 22:25:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "o1p2q3r4s5t6"
down_revision: Union[str, Sequence[str], None] = "n0o1p2q3r4s5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Backfill school_program_name from legacy program_name where needed.
    op.execute(
        """
        UPDATE orders
        SET school_program_name = COALESCE(
              NULLIF(TRIM(school_program_name), ''),
              NULLIF(TRIM(program_name), '')
            )
        WHERE cheer_form_subtype = 'youth-rec-cheer'
           OR form_type IN (
                'school-all-star-dance',
                'marching-band',
                'sports-entertainment',
                'school-anthem'
              )
        """
    )
    # School cheer: prefer school_name
    op.execute(
        """
        UPDATE orders
        SET school_name = COALESCE(
              NULLIF(TRIM(school_name), ''),
              NULLIF(TRIM(program_name), '')
            )
        WHERE cheer_form_subtype IN (
              'school-cheer-viroc-yes',
              'school-cheer-viroc-no'
            )
        """
    )
    # All Star: prefer gym_name
    op.execute(
        """
        UPDATE orders
        SET gym_name = COALESCE(
              NULLIF(TRIM(gym_name), ''),
              NULLIF(TRIM(program_name), '')
            )
        WHERE cheer_form_subtype = 'all-star-cheer'
           OR (
                form_type = 'school-all-star-cheer'
                AND cheer_form_subtype IS NULL
              )
        """
    )

    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS program_name")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS category")


def downgrade() -> None:
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS program_name VARCHAR")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS category VARCHAR")
    op.execute(
        """
        UPDATE orders
        SET category = CASE form_type
              WHEN 'school-all-star-dance' THEN 'Dance'
              WHEN 'marching-band' THEN 'Marching Band'
              WHEN 'sports-entertainment' THEN 'Sports Entertainment'
              WHEN 'school-anthem' THEN 'School Anthem'
              ELSE 'Cheer'
            END,
            program_name = COALESCE(
              NULLIF(TRIM(gym_name), ''),
              NULLIF(TRIM(school_name), ''),
              NULLIF(TRIM(school_program_name), '')
            )
        """
    )
