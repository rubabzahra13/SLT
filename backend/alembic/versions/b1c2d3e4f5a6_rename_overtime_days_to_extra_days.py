"""rename producers.overtime_days to extra_days

Revision ID: b1c2d3e4f5a6
Revises: a0b1c2d3e4f5
Create Date: 2026-10-04
"""

from typing import Sequence, Union

from alembic import op

revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, None] = "a0b1c2d3e4f5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("producers", "overtime_days", new_column_name="extra_days")


def downgrade() -> None:
    op.alter_column("producers", "extra_days", new_column_name="overtime_days")
