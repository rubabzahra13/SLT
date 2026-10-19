"""phase4: drop redundant MTD assignment columns (Orders SoT)

Removes denormalized assignment/schedule from mtd_records. API projects these
from the linked order on read; writes go to orders only.

Dropped from mtd_records:
  assigned_producer_id, editor_initials, mix_start_date, mix_end_date,
  is_reassigned

Revision ID: p4a5b6c7d8e9
Revises: p3a4b5c6d7e8
Create Date: 2026-10-19 20:50:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "p4a5b6c7d8e9"
down_revision: Union[str, Sequence[str], None] = "p3a4b5c6d7e8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Backfill Orders from MTD before drop (only fill empty Order fields).
    op.execute(
        """
        UPDATE orders o
        SET
          assigned_producer_id = COALESCE(o.assigned_producer_id, m.assigned_producer_id),
          assigned_producer = COALESCE(
            NULLIF(BTRIM(o.assigned_producer), ''),
            NULLIF(BTRIM(m.editor_initials), '')
          ),
          mix_start_date = COALESCE(
            NULLIF(BTRIM(o.mix_start_date), ''),
            CASE WHEN m.mix_start_date IS NOT NULL THEN m.mix_start_date::text ELSE NULL END
          ),
          mix_end_date = COALESCE(
            NULLIF(BTRIM(o.mix_end_date), ''),
            CASE WHEN m.mix_end_date IS NOT NULL THEN m.mix_end_date::text ELSE NULL END
          ),
          is_reassigned = CASE
            WHEN o.is_reassigned IS TRUE THEN TRUE
            ELSE COALESCE(m.is_reassigned, FALSE)
          END
        FROM mtd_records m
        WHERE m.order_id = o.id
        """
    )
    op.execute(
        "DROP INDEX IF EXISTS ix_mtd_records_assigned_producer_id"
    )
    op.execute(
        "ALTER TABLE mtd_records DROP CONSTRAINT IF EXISTS mtd_records_assigned_producer_id_fkey"
    )
    op.execute("ALTER TABLE mtd_records DROP COLUMN IF EXISTS assigned_producer_id")
    op.execute("ALTER TABLE mtd_records DROP COLUMN IF EXISTS editor_initials")
    op.execute("ALTER TABLE mtd_records DROP COLUMN IF EXISTS mix_start_date")
    op.execute("ALTER TABLE mtd_records DROP COLUMN IF EXISTS mix_end_date")
    op.execute("ALTER TABLE mtd_records DROP COLUMN IF EXISTS is_reassigned")


def downgrade() -> None:
    op.execute(
        "ALTER TABLE mtd_records ADD COLUMN IF NOT EXISTS assigned_producer_id UUID"
    )
    op.execute(
        "ALTER TABLE mtd_records ADD COLUMN IF NOT EXISTS editor_initials VARCHAR"
    )
    op.execute("ALTER TABLE mtd_records ADD COLUMN IF NOT EXISTS mix_start_date DATE")
    op.execute("ALTER TABLE mtd_records ADD COLUMN IF NOT EXISTS mix_end_date DATE")
    op.execute(
        "ALTER TABLE mtd_records ADD COLUMN IF NOT EXISTS is_reassigned BOOLEAN DEFAULT FALSE NOT NULL"
    )
    op.execute(
        """
        ALTER TABLE mtd_records
        ADD CONSTRAINT mtd_records_assigned_producer_id_fkey
        FOREIGN KEY (assigned_producer_id) REFERENCES producers(id) ON DELETE SET NULL
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_mtd_records_assigned_producer_id ON mtd_records (assigned_producer_id)"
    )
