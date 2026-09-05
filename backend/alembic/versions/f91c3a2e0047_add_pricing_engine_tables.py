"""add_pricing_engine_tables

Revision ID: f91c3a2e0047
Revises: d48f12a9b301
Create Date: 2026-09-05 05:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'f91c3a2e0047'
down_revision: Union[str, Sequence[str], None] = 'd48f12a9b301'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # pricing_rules — one row per (form_type, subtype_id, package_id)
    op.create_table(
        'pricing_rules',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('form_type', sa.String(), nullable=False),
        sa.Column('subtype_id', sa.String(), nullable=True),
        sa.Column('package_id', sa.String(), nullable=False),
        sa.Column('package_name', sa.String(), nullable=False),
        sa.Column('customer_facing_price', sa.Numeric(10, 2), nullable=True),
        sa.Column('payroll_base_compliant', sa.Numeric(10, 2), nullable=True),
        sa.Column('payroll_base_non_compliant', sa.Numeric(10, 2), nullable=True),
        sa.Column('compliance_sensitive', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_pricing_rules_form_type', 'pricing_rules', ['form_type'])
    op.create_index('ix_pricing_rules_subtype_id', 'pricing_rules', ['subtype_id'])
    op.create_index('ix_pricing_rules_package_id', 'pricing_rules', ['package_id'])
    op.create_unique_constraint(
        'uq_pricing_rules_form_subtype_package',
        'pricing_rules',
        ['form_type', 'subtype_id', 'package_id'],
    )

    # addon_rules — one row per add-on type
    op.create_table(
        'addon_rules',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('addon_id', sa.String(), nullable=False, unique=True),
        sa.Column('label', sa.String(), nullable=False),
        sa.Column('amount', sa.Numeric(10, 2), nullable=True),
        sa.Column('unit_amount', sa.Numeric(10, 2), nullable=True),
        sa.Column('input_type', sa.String(), nullable=False),
        sa.Column('scope', sa.String(), nullable=False, server_default='global'),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_addon_rules_addon_id', 'addon_rules', ['addon_id'])

    # compliant_affiliates — canonical affiliate names + synonym lists
    op.create_table(
        'compliant_affiliates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(), nullable=False, unique=True),
        sa.Column('synonyms', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_compliant_affiliates_name', 'compliant_affiliates', ['name'])

    # Enable RLS on new tables
    for table in ['pricing_rules', 'addon_rules', 'compliant_affiliates']:
        op.execute(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY;")


def downgrade() -> None:
    op.drop_table('compliant_affiliates')
    op.drop_table('addon_rules')
    op.drop_table('pricing_rules')
