"""add_collection_states_to_orders_and_mtd

Revision ID: a90b1c2d3e4f
Revises: f01a2b3c4d5e
Create Date: 2026-09-22 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'a90b1c2d3e4f'
down_revision: Union[str, Sequence[str], None] = 'f01a2b3c4d5e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('orders', sa.Column('collection_states', sa.JSON(), nullable=True))
    op.add_column('mtd_records', sa.Column('collection_states', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('orders', 'collection_states')
    op.drop_column('mtd_records', 'collection_states')
