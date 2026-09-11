"""add_in_mtd_to_mtd_records

Revision ID: a8b9c0d1e2f3
Revises: f92d4b5a6c7e
Create Date: 2026-09-11 09:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a8b9c0d1e2f3'
down_revision: Union[str, Sequence[str], None] = 'f92d4b5a6c7e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('mtd_records', sa.Column('in_mtd', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_column('mtd_records', 'in_mtd')
