"""Add original producer on voiceover payroll add-ons.

Revision ID: c1d2e3f4a5b7
Revises: b0c1d2e3f4a5
Create Date: 2026-11-11

original_producer_id is informational (whose mix the voiceover was for).
producer_id remains the payment recipient. Both columns are nullable so
voiceovers created before this change keep loading.
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "c1d2e3f4a5b7"
down_revision: Union[str, Sequence[str], None] = "b0c1d2e3f4a5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "payroll_addons",
        sa.Column(
            "original_producer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("producers.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "payroll_addons",
        sa.Column("original_producer_initials", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("payroll_addons", "original_producer_initials")
    op.drop_column("payroll_addons", "original_producer_id")
