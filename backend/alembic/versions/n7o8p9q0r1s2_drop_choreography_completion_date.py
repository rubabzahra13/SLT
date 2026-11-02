"""drop choreography_completion_date from orders

Manual Mix Information choreography / music-by date is retired.
UI, API schemas, and model no longer expose the field.

Revision ID: n7o8p9q0r1s2
Revises: m6n7o8p9q0r1
Create Date: 2026-11-02 21:40:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "n7o8p9q0r1s2"
down_revision: Union[str, Sequence[str], None] = "m6n7o8p9q0r1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE orders DROP COLUMN IF EXISTS choreography_completion_date"
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS choreography_completion_date VARCHAR
        """
    )
