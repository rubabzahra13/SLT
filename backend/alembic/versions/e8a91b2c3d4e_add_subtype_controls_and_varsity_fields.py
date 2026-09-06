"""add_subtype_controls_and_varsity_fields

Revision ID: e8a91b2c3d4e
Revises: a7b891f23d04
Create Date: 2026-09-07 02:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'e8a91b2c3d4e'
down_revision: Union[str, Sequence[str], None] = 'a7b891f23d04'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('orders', sa.Column('varsity_viroc_customer', sa.String(), nullable=True))
    op.add_column('mtd_records', sa.Column('has_rally_mix', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('mtd_records', sa.Column('has_extend_8ct_addon', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('mtd_records', sa.Column('has_processing_8ct_sheets_addon', sa.Boolean(), nullable=False, server_default='false'))

def downgrade() -> None:
    op.drop_column('mtd_records', 'has_processing_8ct_sheets_addon')
    op.drop_column('mtd_records', 'has_extend_8ct_addon')
    op.drop_column('mtd_records', 'has_rally_mix')
    op.drop_column('orders', 'varsity_viroc_customer')
