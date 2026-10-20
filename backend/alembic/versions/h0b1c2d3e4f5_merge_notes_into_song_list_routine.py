"""merge instrumentation/lyrical notes into song_list + routine_notes

School Anthem "Instrumental Style Preference" / MB instrumentation notes
→ song_list_suggestions.

School Anthem "Lyrical Notes" / MB lyrical notes → routine_notes.

Revision ID: h0b1c2d3e4f5
Revises: g9a0b1c2d3e4
Create Date: 2026-10-20 14:25:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "h0b1c2d3e4f5"
down_revision: Union[str, Sequence[str], None] = "g9a0b1c2d3e4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE orders
        SET song_list_suggestions = COALESCE(
              NULLIF(TRIM(song_list_suggestions), ''),
              NULLIF(TRIM(instrumentation_notes), '')
            )
        WHERE NULLIF(TRIM(instrumentation_notes), '') IS NOT NULL
        """
    )
    op.execute(
        """
        UPDATE orders
        SET routine_notes = COALESCE(
              NULLIF(TRIM(routine_notes), ''),
              NULLIF(TRIM(lyrical_notes), '')
            )
        WHERE NULLIF(TRIM(lyrical_notes), '') IS NOT NULL
        """
    )
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS instrumentation_notes")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS lyrical_notes")


def downgrade() -> None:
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS instrumentation_notes TEXT"
    )
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS lyrical_notes TEXT")
    op.execute(
        """
        UPDATE orders
        SET instrumentation_notes = song_list_suggestions
        """
    )
    op.execute(
        """
        UPDATE orders
        SET lyrical_notes = routine_notes
        """
    )
