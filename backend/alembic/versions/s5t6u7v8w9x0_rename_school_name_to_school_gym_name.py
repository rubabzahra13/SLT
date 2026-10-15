"""rename school_name to school_gym_name

Matches school_gym_billing_address naming (gym / school / program / org).

Revision ID: s5t6u7v8w9x0
Revises: r4s5t6u7v8w9
Create Date: 2026-10-14 23:28:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "s5t6u7v8w9x0"
down_revision: Union[str, Sequence[str], None] = "r4s5t6u7v8w9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE orders RENAME COLUMN school_name TO school_gym_name"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE orders RENAME COLUMN school_gym_name TO school_name"
    )
