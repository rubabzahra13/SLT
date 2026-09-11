"""add_missing_producer_fields

Revision ID: f92d4b5a6c7e
Revises: e8a91b2c3d4e
Create Date: 2026-09-11 08:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f92d4b5a6c7e'
down_revision: Union[str, Sequence[str], None] = 'e8a91b2c3d4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('producers', sa.Column('categories', sa.JSON(), nullable=True))
    op.add_column('producers', sa.Column('dance_voiceover_rate', sa.Numeric(5, 4), nullable=True))
    op.add_column('producers', sa.Column('cheer_voiceover_rate', sa.Numeric(5, 4), nullable=True))
    op.add_column('producers', sa.Column('rush_fee_rate', sa.Numeric(5, 4), nullable=True))


def downgrade() -> None:
    op.drop_column('producers', 'rush_fee_rate')
    op.drop_column('producers', 'cheer_voiceover_rate')
    op.drop_column('producers', 'dance_voiceover_rate')
    op.drop_column('producers', 'categories')
