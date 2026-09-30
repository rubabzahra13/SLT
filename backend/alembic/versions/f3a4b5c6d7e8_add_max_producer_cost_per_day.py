"""add max_producer_cost_per_day to producers

Revision ID: f3a4b5c6d7e8
Revises: e6f7a8b9c0d1
Create Date: 2026-10-01 03:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f3a4b5c6d7e8"
down_revision: Union[str, Sequence[str], None] = "e6f7a8b9c0d1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "producers",
        sa.Column("max_producer_cost_per_day", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("producers", "max_producer_cost_per_day")
