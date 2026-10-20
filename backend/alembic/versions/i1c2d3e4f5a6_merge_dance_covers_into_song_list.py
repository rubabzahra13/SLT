"""merge power/unleash covers into song_list_suggestions

Dance Magento "Power Music Covers" + "Unleash the Beats Covers" share the
same SoT as Cheer Song List — packed with Magento labels in
song_list_suggestions.

Revision ID: i1c2d3e4f5a6
Revises: h0b1c2d3e4f5
Create Date: 2026-10-20 14:35:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "i1c2d3e4f5a6"
down_revision: Union[str, Sequence[str], None] = "h0b1c2d3e4f5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Prefer existing song_list; otherwise pack Dance cover columns.
    op.execute(
        """
        UPDATE orders
        SET song_list_suggestions = CONCAT(
              'Power Music Covers:', E'\\n',
              COALESCE(power_music_covers, ''),
              E'\\n\\nUnleash the Beats Covers:', E'\\n',
              COALESCE(unleash_the_beats_covers, '')
            )
        WHERE NULLIF(TRIM(song_list_suggestions), '') IS NULL
          AND (
            NULLIF(TRIM(power_music_covers), '') IS NOT NULL
            OR NULLIF(TRIM(unleash_the_beats_covers), '') IS NOT NULL
          )
        """
    )
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS power_music_covers")
    op.execute(
        "ALTER TABLE orders DROP COLUMN IF EXISTS unleash_the_beats_covers"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS power_music_covers TEXT"
    )
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS "
        "unleash_the_beats_covers TEXT"
    )
