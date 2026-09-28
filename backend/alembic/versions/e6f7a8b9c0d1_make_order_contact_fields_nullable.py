"""make order contact fields nullable

Revision ID: e6f7a8b9c0d1
Revises: d5e6f7a8b9c0
Create Date: 2026-09-29 00:15:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'e6f7a8b9c0d1'
down_revision = 'd5e6f7a8b9c0'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.alter_column('orders', 'contact_name', existing_type=sa.String(), nullable=True)
    op.alter_column('orders', 'customer_name', existing_type=sa.String(), nullable=True)
    op.alter_column('orders', 'program_name', existing_type=sa.String(), nullable=True)
    op.alter_column('orders', 'category', existing_type=sa.String(), nullable=True)
    op.alter_column('orders', 'package', existing_type=sa.String(), nullable=True)

def downgrade() -> None:
    op.alter_column('orders', 'contact_name', existing_type=sa.String(), nullable=False)
    op.alter_column('orders', 'customer_name', existing_type=sa.String(), nullable=False)
    op.alter_column('orders', 'program_name', existing_type=sa.String(), nullable=False)
    op.alter_column('orders', 'category', existing_type=sa.String(), nullable=False)
    op.alter_column('orders', 'package', existing_type=sa.String(), nullable=False)
