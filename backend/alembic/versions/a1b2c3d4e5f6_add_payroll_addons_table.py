"""add_payroll_addons_table

Revision ID: a1b2c3d4e5f6
Revises: f01a2b3c4d5e
Create Date: 2026-09-22 13:34:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "a90b1c2d3e4f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "payroll_addons",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("program_name", sa.String(), nullable=False),
        sa.Column("contact_name", sa.String(), nullable=True),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("addon_type", sa.String(), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("rate_source", sa.String(), nullable=False, server_default="predefined"),
        sa.Column(
            "producer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("producers.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("producer_initials", sa.String(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("payroll_addons")
