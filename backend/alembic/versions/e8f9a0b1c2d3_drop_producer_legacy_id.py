"""drop producers.legacy_id

Revision ID: e8f9a0b1c2d3
Revises: d7e8f9a0b1c2
Create Date: 2026-10-04 16:45:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e8f9a0b1c2d3"
down_revision: Union[str, Sequence[str], None] = "d7e8f9a0b1c2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("producers", "legacy_id")


def downgrade() -> None:
    op.add_column(
        "producers",
        sa.Column("legacy_id", sa.String(), nullable=True),
    )
    op.create_index(
        op.f("ix_producers_legacy_id"),
        "producers",
        ["legacy_id"],
        unique=False,
    )
