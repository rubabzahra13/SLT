"""merge team/youth_rec/school_program colors into colors

One colors column; UI still labels by form (Team Colors, Colors, School/Program Colors).

Revision ID: t6u7v8w9x0y1
Revises: s5t6u7v8w9x0
Create Date: 2026-10-14 23:46:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "t6u7v8w9x0y1"
down_revision: Union[str, Sequence[str], None] = "s5t6u7v8w9x0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS colors VARCHAR")
    op.execute(
        """
        UPDATE orders
        SET colors = COALESCE(
              NULLIF(TRIM(colors), ''),
              NULLIF(TRIM(team_colors), ''),
              NULLIF(TRIM(youth_rec_colors), ''),
              NULLIF(TRIM(school_program_colors), '')
            )
        """
    )
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS team_colors")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS youth_rec_colors")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS school_program_colors")


def downgrade() -> None:
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS team_colors VARCHAR")
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS youth_rec_colors VARCHAR"
    )
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS school_program_colors VARCHAR"
    )
    op.execute(
        """
        UPDATE orders
        SET team_colors = colors,
            youth_rec_colors = colors,
            school_program_colors = colors
        """
    )
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS colors")
