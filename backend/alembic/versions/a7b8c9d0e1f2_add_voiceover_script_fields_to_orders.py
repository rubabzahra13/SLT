"""add voiceover script fields to orders

Revision ID: a7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-10-13 01:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a7b8c9d0e1f2"
down_revision: Union[str, Sequence[str], None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS voiceover_script "
        "TEXT NULL;"
    )
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS pronunciation_guidance "
        "TEXT NULL;"
    )


def downgrade() -> None:
    op.drop_column("orders", "pronunciation_guidance")
    op.drop_column("orders", "voiceover_script")
