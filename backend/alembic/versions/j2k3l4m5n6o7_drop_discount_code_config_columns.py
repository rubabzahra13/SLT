"""drop obsolete discount config columns from discount_codes

Coupon codes are match-only. Remove description, discount_type, and
discount_value. Keep id, code, timestamps (and any unrelated columns).

Revision ID: j2k3l4m5n6o7
Revises: i1c2d3e4f5a6
Create Date: 2026-10-21 15:00:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "j2k3l4m5n6o7"
down_revision: Union[str, Sequence[str], None] = "i1c2d3e4f5a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # IF EXISTS keeps this safe if a column was never added in some envs.
    op.execute(
        "ALTER TABLE discount_codes DROP COLUMN IF EXISTS description"
    )
    op.execute(
        "ALTER TABLE discount_codes DROP COLUMN IF EXISTS discount_type"
    )
    op.execute(
        "ALTER TABLE discount_codes DROP COLUMN IF EXISTS discount_value"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE discount_codes ADD COLUMN IF NOT EXISTS description TEXT"
    )
    op.execute(
        "ALTER TABLE discount_codes "
        "ADD COLUMN IF NOT EXISTS discount_type VARCHAR"
    )
    op.execute(
        "ALTER TABLE discount_codes "
        "ADD COLUMN IF NOT EXISTS discount_value DOUBLE PRECISION"
    )
