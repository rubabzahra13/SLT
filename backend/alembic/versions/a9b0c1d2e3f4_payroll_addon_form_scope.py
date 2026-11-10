"""Store form + subtype scope on payroll_addons voiceovers.

Revision ID: a9b0c1d2e3f4
Revises: q1r2s3t4u5v6
Create Date: 2026-11-10
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a9b0c1d2e3f4"
down_revision: Union[str, Sequence[str], None] = "q1r2s3t4u5v6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "payroll_addons",
        sa.Column("form_type", sa.String(), nullable=True),
    )
    op.add_column(
        "payroll_addons",
        sa.Column("cheer_form_subtype", sa.String(), nullable=True),
    )
    op.add_column(
        "payroll_addons",
        sa.Column("dance_form_subtype", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("payroll_addons", "dance_form_subtype")
    op.drop_column("payroll_addons", "cheer_form_subtype")
    op.drop_column("payroll_addons", "form_type")
