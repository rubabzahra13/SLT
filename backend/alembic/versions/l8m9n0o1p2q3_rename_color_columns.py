"""rename colors to youth_rec_colors; add school_program_colors

Revision ID: l8m9n0o1p2q3
Revises: k7l8m9n0o1p2
Create Date: 2026-10-14 20:35:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "l8m9n0o1p2q3"
down_revision: Union[str, Sequence[str], None] = "k7l8m9n0o1p2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS school_program_colors VARCHAR"
    )
    # Rename vague `colors` → Youth Rec only column.
    op.execute(
        """
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'orders'
              AND column_name = 'colors'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'orders'
              AND column_name = 'youth_rec_colors'
          ) THEN
            ALTER TABLE orders RENAME COLUMN colors TO youth_rec_colors;
          END IF;
        END $$;
        """
    )
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS youth_rec_colors VARCHAR"
    )

    # School Anthem (and any mirrored team_colors) → school_program_colors.
    op.execute(
        """
        UPDATE orders
        SET school_program_colors = COALESCE(
              NULLIF(TRIM(school_program_colors), ''),
              NULLIF(TRIM(youth_rec_colors), ''),
              NULLIF(TRIM(team_colors), '')
            ),
            youth_rec_colors = NULL,
            team_colors = NULL
        WHERE form_type = 'school-anthem'
        """
    )

    # Youth Rec: keep youth_rec_colors; drop mirrored team_colors.
    op.execute(
        """
        UPDATE orders
        SET youth_rec_colors = COALESCE(
              NULLIF(TRIM(youth_rec_colors), ''),
              NULLIF(TRIM(team_colors), '')
            ),
            team_colors = NULL
        WHERE cheer_form_subtype = 'youth-rec-cheer'
        """
    )

    # All Star / School Cheer: team_colors only.
    op.execute(
        """
        UPDATE orders
        SET youth_rec_colors = NULL
        WHERE cheer_form_subtype IN (
              'all-star-cheer',
              'school-cheer-viroc-yes',
              'school-cheer-viroc-no'
            )
           OR (
              form_type = 'school-all-star-cheer'
              AND cheer_form_subtype IS DISTINCT FROM 'youth-rec-cheer'
            )
        """
    )

    # Other forms should not keep youth_rec_colors.
    op.execute(
        """
        UPDATE orders
        SET youth_rec_colors = NULL
        WHERE form_type IS DISTINCT FROM 'school-all-star-cheer'
          AND cheer_form_subtype IS DISTINCT FROM 'youth-rec-cheer'
          AND form_type IS DISTINCT FROM 'school-anthem'
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'orders'
              AND column_name = 'youth_rec_colors'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'orders'
              AND column_name = 'colors'
          ) THEN
            ALTER TABLE orders RENAME COLUMN youth_rec_colors TO colors;
          END IF;
        END $$;
        """
    )
    # Best-effort: fold school_program_colors back into colors for anthem.
    op.execute(
        """
        UPDATE orders
        SET colors = COALESCE(NULLIF(TRIM(colors), ''), school_program_colors)
        WHERE form_type = 'school-anthem'
        """
    )
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS school_program_colors")
