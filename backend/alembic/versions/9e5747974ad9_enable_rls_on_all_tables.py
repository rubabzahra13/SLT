"""enable_rls_on_all_tables

Revision ID: 9e5747974ad9
Revises: c37abb0651e4
Create Date: 2026-09-05 02:22:35.090194

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9e5747974ad9'
down_revision: Union[str, Sequence[str], None] = 'c37abb0651e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


TABLES = [
    "alembic_version",
    "producers",
    "producer_time_off",
    "orders",
    "mtd_records",
    "schedule_entries",
    "discount_codes",
    "package_prices",
    "secret_menu_pricing",
]

def upgrade() -> None:
    """Upgrade schema - enable RLS on all public tables."""
    for table in TABLES:
        op.execute(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY;")


def downgrade() -> None:
    """Downgrade schema - disable RLS on all public tables."""
    for table in TABLES:
        op.execute(f"ALTER TABLE public.{table} DISABLE ROW LEVEL SECURITY;")

