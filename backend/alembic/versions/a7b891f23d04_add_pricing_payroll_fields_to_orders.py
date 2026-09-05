"""add_pricing_payroll_fields_to_orders

Revision ID: a7b891f23d04
Revises: f91c3a2e0047
Create Date: 2026-09-05 05:16:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'a7b891f23d04'
down_revision: Union[str, Sequence[str], None] = 'f91c3a2e0047'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('orders', sa.Column('system_calculated_customer_price', sa.Numeric(10, 2), nullable=True))
    op.add_column('orders', sa.Column('final_customer_price', sa.Numeric(10, 2), nullable=True))
    op.add_column('orders', sa.Column('final_customer_price_overridden', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('orders', sa.Column('pricing_breakdown', sa.JSON(), nullable=True))
    op.add_column('orders', sa.Column('rate_used', sa.Numeric(5, 4), nullable=True))
    op.add_column('orders', sa.Column('rate_source', sa.String(), nullable=True))
    op.add_column('orders', sa.Column('producer_payout', sa.Numeric(10, 2), nullable=True))
    op.add_column('orders', sa.Column('slt_portion', sa.Numeric(10, 2), nullable=True))
    op.add_column('orders', sa.Column('payroll_finalized', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('orders', sa.Column('payroll_breakdown', sa.JSON(), nullable=True))


def downgrade() -> None:
    for col in [
        'payroll_breakdown', 'payroll_finalized', 'slt_portion',
        'producer_payout', 'rate_source', 'rate_used', 'pricing_breakdown',
        'final_customer_price_overridden', 'final_customer_price',
        'system_calculated_customer_price',
    ]:
        op.drop_column('orders', col)
