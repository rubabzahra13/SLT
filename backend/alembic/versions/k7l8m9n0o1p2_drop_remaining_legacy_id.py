"""drop legacy_id from discount_codes and studio settings

Revision ID: k7l8m9n0o1p2
Revises: j6k7l8m9n0o1
Create Date: 2026-10-14 19:35:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "k7l8m9n0o1p2"
down_revision: Union[str, Sequence[str], None] = "j7k8l9m0n1o2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_discount_codes_legacy_id")
    op.execute("ALTER TABLE discount_codes DROP COLUMN IF EXISTS legacy_id")

    op.execute("DROP INDEX IF EXISTS ix_studio_holidays_legacy_id")
    op.execute("ALTER TABLE studio_holidays DROP COLUMN IF EXISTS legacy_id")

    op.execute("DROP INDEX IF EXISTS ix_studio_personal_reasons_legacy_id")
    op.execute(
        "ALTER TABLE studio_personal_reasons DROP COLUMN IF EXISTS legacy_id"
    )


def downgrade() -> None:
    op.add_column(
        "studio_personal_reasons",
        sa.Column("legacy_id", sa.String(), nullable=True),
    )
    op.create_index(
        op.f("ix_studio_personal_reasons_legacy_id"),
        "studio_personal_reasons",
        ["legacy_id"],
        unique=False,
    )
    op.add_column(
        "studio_holidays",
        sa.Column("legacy_id", sa.String(), nullable=True),
    )
    op.create_index(
        op.f("ix_studio_holidays_legacy_id"),
        "studio_holidays",
        ["legacy_id"],
        unique=False,
    )
    op.add_column(
        "discount_codes",
        sa.Column("legacy_id", sa.String(), nullable=True),
    )
    op.create_index(
        op.f("ix_discount_codes_legacy_id"),
        "discount_codes",
        ["legacy_id"],
        unique=False,
    )
