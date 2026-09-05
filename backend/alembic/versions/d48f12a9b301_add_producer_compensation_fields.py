"""add_producer_compensation_fields

Revision ID: d48f12a9b301
Revises: 9e5747974ad9
Create Date: 2026-09-05 05:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd48f12a9b301'
down_revision: Union[str, Sequence[str], None] = '9e5747974ad9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('producers', sa.Column('compensation_model', sa.String(), nullable=True))
    op.add_column('producers', sa.Column('default_rate', sa.Numeric(precision=5, scale=4), nullable=True))
    op.add_column('producers', sa.Column('rates_by_category', sa.JSON(), nullable=True))
    op.add_column('producers', sa.Column('rate_overrides', sa.JSON(), nullable=True))
    op.add_column('producers', sa.Column('manual_input_fields', sa.JSON(), nullable=True))
    op.add_column('producers', sa.Column('notes', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('producers', 'notes')
    op.drop_column('producers', 'manual_input_fields')
    op.drop_column('producers', 'rate_overrides')
    op.drop_column('producers', 'rates_by_category')
    op.drop_column('producers', 'default_rate')
    op.drop_column('producers', 'compensation_model')
