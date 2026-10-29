"""add unleash_the_beats_covers to orders

Dance Magento "Unleash the Beats Covers" is its own field: not
song_list_suggestions (cheer Song List/Suggestions).

Revision ID: e7f8a9b0c1d2
Revises: d6e7f8a9b0c1
Create Date: 2026-10-15 21:21:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "e7f8a9b0c1d2"
down_revision: Union[str, Sequence[str], None] = "d6e7f8a9b0c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS unleash_the_beats_covers TEXT"
    )
    # Dance rows previously stored Unleash text in song_list_suggestions.
    op.execute(
        """
        UPDATE orders
        SET unleash_the_beats_covers = song_list_suggestions,
            song_list_suggestions = NULL
        WHERE form_type = 'school-all-star-dance'
          AND NULLIF(TRIM(song_list_suggestions), '') IS NOT NULL
          AND NULLIF(TRIM(unleash_the_beats_covers), '') IS NULL
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE orders
        SET song_list_suggestions = COALESCE(
              NULLIF(TRIM(song_list_suggestions), ''),
              NULLIF(TRIM(unleash_the_beats_covers), '')
            )
        WHERE form_type = 'school-all-star-dance'
          AND NULLIF(TRIM(unleash_the_beats_covers), '') IS NOT NULL
        """
    )
    op.execute(
        "ALTER TABLE orders DROP COLUMN IF EXISTS unleash_the_beats_covers"
    )
