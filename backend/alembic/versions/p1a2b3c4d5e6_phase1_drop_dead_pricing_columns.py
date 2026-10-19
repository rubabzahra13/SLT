"""phase1: drop dead + redundant MTD pricing columns

- Both tables: slt_portion, payroll_finalized, payroll_breakdown
- MTD only: has_rally_mix, pricing_breakdown, system_calculated_customer_price,
  producer_payout, rate_used, rate_source

Orders keeps system_calculated_*, producer_payout, rate_*, pricing_breakdown.
MTD keeps price / final_customer_price* / price_compliance as board display cache.

Revision ID: p1a2b3c4d5e6
Revises: p0a1b2c3d4e5
Create Date: 2026-10-19 12:40:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "p1a2b3c4d5e6"
down_revision: Union[str, Sequence[str], None] = "p0a1b2c3d4e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- orders: unused audit / display-never columns ---
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS slt_portion")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS payroll_finalized")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS payroll_breakdown")

    # --- mtd_records: dead + redundant pricing copies (Orders is SoT) ---
    op.execute("ALTER TABLE mtd_records DROP COLUMN IF EXISTS slt_portion")
    op.execute("ALTER TABLE mtd_records DROP COLUMN IF EXISTS payroll_finalized")
    op.execute("ALTER TABLE mtd_records DROP COLUMN IF EXISTS payroll_breakdown")
    op.execute("ALTER TABLE mtd_records DROP COLUMN IF EXISTS pricing_breakdown")
    op.execute("ALTER TABLE mtd_records DROP COLUMN IF EXISTS has_rally_mix")
    op.execute(
        "ALTER TABLE mtd_records DROP COLUMN IF EXISTS system_calculated_customer_price"
    )
    op.execute("ALTER TABLE mtd_records DROP COLUMN IF EXISTS producer_payout")
    op.execute("ALTER TABLE mtd_records DROP COLUMN IF EXISTS rate_used")
    op.execute("ALTER TABLE mtd_records DROP COLUMN IF EXISTS rate_source")


def downgrade() -> None:
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS slt_portion NUMERIC(10, 2)"
    )
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS payroll_finalized "
        "BOOLEAN NOT NULL DEFAULT false"
    )
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS payroll_breakdown JSON")

    op.execute(
        "ALTER TABLE mtd_records ADD COLUMN IF NOT EXISTS slt_portion NUMERIC(10, 2)"
    )
    op.execute(
        "ALTER TABLE mtd_records ADD COLUMN IF NOT EXISTS payroll_finalized "
        "BOOLEAN NOT NULL DEFAULT false"
    )
    op.execute(
        "ALTER TABLE mtd_records ADD COLUMN IF NOT EXISTS payroll_breakdown TEXT"
    )
    op.execute(
        "ALTER TABLE mtd_records ADD COLUMN IF NOT EXISTS pricing_breakdown TEXT"
    )
    op.execute(
        "ALTER TABLE mtd_records ADD COLUMN IF NOT EXISTS has_rally_mix "
        "BOOLEAN NOT NULL DEFAULT false"
    )
    op.execute(
        "ALTER TABLE mtd_records ADD COLUMN IF NOT EXISTS "
        "system_calculated_customer_price NUMERIC(10, 2)"
    )
    op.execute(
        "ALTER TABLE mtd_records ADD COLUMN IF NOT EXISTS producer_payout NUMERIC(10, 2)"
    )
    op.execute(
        "ALTER TABLE mtd_records ADD COLUMN IF NOT EXISTS rate_used NUMERIC(10, 4)"
    )
    op.execute(
        "ALTER TABLE mtd_records ADD COLUMN IF NOT EXISTS rate_source VARCHAR"
    )
