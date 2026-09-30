"""add studio holidays, personal reasons, email templates

Revision ID: a4b5c6d7e8f9
Revises: f3a4b5c6d7e8
Create Date: 2026-10-01 03:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a4b5c6d7e8f9"
down_revision: Union[str, Sequence[str], None] = "f3a4b5c6d7e8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "studio_holidays",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("legacy_id", sa.String(), nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("start_date", sa.String(), nullable=False),
        sa.Column("end_date", sa.String(), nullable=False),
        sa.Column("applies_to_all", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("producer_ids", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_studio_holidays_legacy_id"), "studio_holidays", ["legacy_id"], unique=False)

    op.create_table(
        "studio_personal_reasons",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("legacy_id", sa.String(), nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_other", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_studio_personal_reasons_legacy_id"),
        "studio_personal_reasons",
        ["legacy_id"],
        unique=False,
    )

    op.create_table(
        "email_templates",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("subject", sa.Text(), nullable=False, server_default=""),
        sa.Column("greeting", sa.Text(), nullable=False, server_default=""),
        sa.Column("intro", sa.Text(), nullable=False, server_default=""),
        sa.Column("footer", sa.Text(), nullable=False, server_default=""),
        sa.Column("signature", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("email_templates")
    op.drop_index(op.f("ix_studio_personal_reasons_legacy_id"), table_name="studio_personal_reasons")
    op.drop_table("studio_personal_reasons")
    op.drop_index(op.f("ix_studio_holidays_legacy_id"), table_name="studio_holidays")
    op.drop_table("studio_holidays")
