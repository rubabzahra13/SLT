"""add rush fee quantity and compensation override to payroll addons

Revision ID: i5j6k7l8m9n0
Revises: h4i5j6k7l8m9
Create Date: 2026-10-13 16:20:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "i5j6k7l8m9n0"
down_revision: Union[str, Sequence[str], None] = "h4i5j6k7l8m9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE payroll_addons ADD COLUMN IF NOT EXISTS quantity INTEGER NULL;"
    )
    op.execute(
        "ALTER TABLE payroll_addons ADD COLUMN IF NOT EXISTS "
        "unit_amount NUMERIC(10, 2) NULL;"
    )
    op.execute(
        "ALTER TABLE payroll_addons ADD COLUMN IF NOT EXISTS "
        "compensation_rate NUMERIC(5, 4) NULL;"
    )
    op.execute(
        "ALTER TABLE payroll_addons ADD COLUMN IF NOT EXISTS "
        "compensation_overridden BOOLEAN NOT NULL DEFAULT FALSE;"
    )


def downgrade() -> None:
    op.drop_column("payroll_addons", "compensation_overridden")
    op.drop_column("payroll_addons", "compensation_rate")
    op.drop_column("payroll_addons", "unit_amount")
    op.drop_column("payroll_addons", "quantity")
