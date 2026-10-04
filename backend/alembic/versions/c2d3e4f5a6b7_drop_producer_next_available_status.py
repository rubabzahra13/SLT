"""drop unused producers.next_available and producers.status

Revision ID: c2d3e4f5a6b7
Revises: b1c2d3e4f5a6
Create Date: 2026-10-04
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c2d3e4f5a6b7"
down_revision: Union[str, None] = "b1c2d3e4f5a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("producers", "next_available")
    op.drop_column("producers", "status")


def downgrade() -> None:
    op.add_column(
        "producers",
        sa.Column("status", sa.String(), nullable=False, server_default="available"),
    )
    op.add_column(
        "producers",
        sa.Column("next_available", sa.String(), nullable=True),
    )
    op.alter_column("producers", "status", server_default=None)
