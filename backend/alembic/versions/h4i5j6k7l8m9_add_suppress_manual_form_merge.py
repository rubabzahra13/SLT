"""add suppress_manual_form_merge to orders

Revision ID: h4i5j6k7l8m9
Revises: g3h4i5j6k7l8
Create Date: 2026-10-13 01:40:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "h4i5j6k7l8m9"
down_revision: Union[str, Sequence[str], None] = "g3h4i5j6k7l8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS "
        "suppress_manual_form_merge BOOLEAN NOT NULL DEFAULT FALSE;"
    )


def downgrade() -> None:
    op.drop_column("orders", "suppress_manual_form_merge")
