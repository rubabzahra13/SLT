"""Partial indexes for Orders / MTD badge counts.

Revision ID: b0c1d2e3f4a5
Revises: a9b0c1d2e3f4
Create Date: 2026-11-11

Speeds COUNT / GROUP BY for board badges without changing API behavior.
Matches live filters: active (not past/completed), not in_mtd, not absorbed
into a manual, assignment / reassign / source splits, MTD board scope.
IF NOT EXISTS so re-runs are safe. No data or query-logic changes.
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op

revision: str = "b0c1d2e3f4a5"
down_revision: Union[str, Sequence[str], None] = "a9b0c1d2e3f4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Orders board + /orders/counts base set (active, not moved to MTD, visible).
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_orders_counts_active_board
        ON orders (created_at DESC, id)
        WHERE COALESCE(is_past_order, false) = false
          AND (status IS NULL OR status NOT IN ('completed', 'in_mtd'))
          AND (
            merged_into_manual_order_id IS NULL
            OR merged_into_manual_order_id = ''
          )
        """
    )
    # Form chip GROUP BY on the same active/visible set.
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_orders_counts_form_type_active
        ON orders (form_type, created_at DESC)
        WHERE COALESCE(is_past_order, false) = false
          AND (status IS NULL OR status NOT IN ('completed', 'in_mtd'))
          AND (
            merged_into_manual_order_id IS NULL
            OR merged_into_manual_order_id = ''
          )
        """
    )
    # Cheer / Dance subtype chips (scoped form + subtype).
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_orders_counts_cheer_subtype_active
        ON orders (cheer_form_subtype, created_at DESC)
        WHERE form_type = 'school-all-star-cheer'
          AND COALESCE(is_past_order, false) = false
          AND (status IS NULL OR status NOT IN ('completed', 'in_mtd'))
          AND (
            merged_into_manual_order_id IS NULL
            OR merged_into_manual_order_id = ''
          )
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_orders_counts_dance_subtype_active
        ON orders (dance_form_subtype, created_at DESC)
        WHERE form_type = 'school-all-star-dance'
          AND COALESCE(is_past_order, false) = false
          AND (status IS NULL OR status NOT IN ('completed', 'in_mtd'))
          AND (
            merged_into_manual_order_id IS NULL
            OR merged_into_manual_order_id = ''
          )
        """
    )
    # Source menu: unmatched manuals vs form/matched.
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_orders_counts_manual_unmatched
        ON orders (created_at DESC, id)
        WHERE is_manual_entry = true
          AND (merged_form_order_id IS NULL OR merged_form_order_id = '')
          AND COALESCE(is_past_order, false) = false
          AND (status IS NULL OR status NOT IN ('completed', 'in_mtd'))
          AND (
            merged_into_manual_order_id IS NULL
            OR merged_into_manual_order_id = ''
          )
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_orders_merged_form_order_id
        ON orders (merged_form_order_id)
        WHERE merged_form_order_id IS NOT NULL
          AND merged_form_order_id <> ''
        """
    )
    # Assigned / Not assigned / Reassign badge predicates.
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_orders_is_reassigned_true
        ON orders (id)
        WHERE is_reassigned = true
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_orders_assigned_producer_id
        ON orders (assigned_producer_id)
        WHERE assigned_producer_id IS NOT NULL
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_orders_assigned_producer_text
        ON orders (assigned_producer)
        WHERE assigned_producer IS NOT NULL
          AND assigned_producer <> ''
          AND assigned_producer <> 'NA'
        """
    )

    # MTD board scope used by /mtd/counts (in_mtd, not yet payroll).
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_mtd_records_counts_board
        ON mtd_records (created_at DESC, id)
        WHERE in_mtd = true
          AND COALESCE(in_payroll, false) = false
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_mtd_records_in_mtd_true
        ON mtd_records (id)
        WHERE in_mtd = true
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_mtd_records_in_mtd_true")
    op.execute("DROP INDEX IF EXISTS ix_mtd_records_counts_board")
    op.execute("DROP INDEX IF EXISTS ix_orders_assigned_producer_text")
    op.execute("DROP INDEX IF EXISTS ix_orders_assigned_producer_id")
    op.execute("DROP INDEX IF EXISTS ix_orders_is_reassigned_true")
    op.execute("DROP INDEX IF EXISTS ix_orders_merged_form_order_id")
    op.execute("DROP INDEX IF EXISTS ix_orders_counts_manual_unmatched")
    op.execute("DROP INDEX IF EXISTS ix_orders_counts_dance_subtype_active")
    op.execute("DROP INDEX IF EXISTS ix_orders_counts_cheer_subtype_active")
    op.execute("DROP INDEX IF EXISTS ix_orders_counts_form_type_active")
    op.execute("DROP INDEX IF EXISTS ix_orders_counts_active_board")
