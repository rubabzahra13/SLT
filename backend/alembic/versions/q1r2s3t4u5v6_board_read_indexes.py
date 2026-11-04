"""Board read indexes for Orders / MTD filters and keyset pages.

Revision ID: q1r2s3t4u5v6
Revises: o8p9q0r1s2t3, y0u7h3cph0n3
Create Date: 2026-11-04 12:00:00.000000

Merges the two open heads and adds indexes that match the live board
filters (status / form / flag / keyset created_at). IF NOT EXISTS so
re-runs are safe. No data changes.
"""
from typing import Sequence, Union

from alembic import op

revision: str = "q1r2s3t4u5v6"
down_revision: Union[str, Sequence[str], None] = ("o8p9q0r1s2t3", "y0u7h3cph0n3")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Orders board: hide in_mtd, filter form/subtype, flag tab, newest keyset.
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_orders_status
        ON orders (status)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_orders_form_type
        ON orders (form_type)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_orders_form_type_cheer_subtype
        ON orders (form_type, cheer_form_subtype)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_orders_form_type_dance_subtype
        ON orders (form_type, dance_form_subtype)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_orders_affiliate_flag_open
        ON orders (affiliate_flag_status)
        WHERE affiliate_flag_status = 'open'
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_orders_created_at_id
        ON orders (created_at DESC, id)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_orders_is_manual_entry
        ON orders (is_manual_entry)
        """
    )

    # MTD scopes (live / payroll / paid) + keyset pages.
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_mtd_records_in_payroll
        ON mtd_records (in_payroll)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_mtd_records_paid_at
        ON mtd_records (paid_at)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_mtd_records_status
        ON mtd_records (status)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_mtd_records_created_at_id
        ON mtd_records (created_at DESC, id)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_mtd_records_scope
        ON mtd_records (in_payroll, paid_at)
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_mtd_records_scope")
    op.execute("DROP INDEX IF EXISTS ix_mtd_records_created_at_id")
    op.execute("DROP INDEX IF EXISTS ix_mtd_records_status")
    op.execute("DROP INDEX IF EXISTS ix_mtd_records_paid_at")
    op.execute("DROP INDEX IF EXISTS ix_mtd_records_in_payroll")
    op.execute("DROP INDEX IF EXISTS ix_orders_is_manual_entry")
    op.execute("DROP INDEX IF EXISTS ix_orders_created_at_id")
    op.execute("DROP INDEX IF EXISTS ix_orders_affiliate_flag_open")
    op.execute("DROP INDEX IF EXISTS ix_orders_form_type_dance_subtype")
    op.execute("DROP INDEX IF EXISTS ix_orders_form_type_cheer_subtype")
    op.execute("DROP INDEX IF EXISTS ix_orders_form_type")
    op.execute("DROP INDEX IF EXISTS ix_orders_status")
