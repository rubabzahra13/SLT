"""drop producers.specialty legacy column

Revision ID: d7e8f9a0b1c2
Revises: c6d7e8f9a0b1
Create Date: 2026-10-04 16:30:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d7e8f9a0b1c2"
down_revision: Union[str, Sequence[str], None] = "c6d7e8f9a0b1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("producers", "specialty")


def downgrade() -> None:
    op.add_column(
        "producers",
        sa.Column("specialty", sa.String(), nullable=False, server_default="General"),
    )
    op.execute(
        """
        UPDATE producers
        SET specialty = COALESCE(
          NULLIF(TRIM(categories ->> 0), ''),
          'General'
        )
        """
    )
    op.alter_column("producers", "specialty", server_default=None)
