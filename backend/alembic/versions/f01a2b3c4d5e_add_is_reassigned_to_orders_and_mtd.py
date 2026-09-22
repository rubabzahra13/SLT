"""add_is_reassigned_to_orders_and_mtd

Revision ID: f01a2b3c4d5e
Revises: e83912ccaaae
Create Date: 2026-09-22 08:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f01a2b3c4d5e'
down_revision: Union[str, Sequence[str], None] = 'e83912ccaaae'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('orders', sa.Column('is_reassigned', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('mtd_records', sa.Column('is_reassigned', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_column('orders', 'is_reassigned')
    op.drop_column('mtd_records', 'is_reassigned')
