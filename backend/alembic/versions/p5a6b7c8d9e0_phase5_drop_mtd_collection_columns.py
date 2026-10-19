"""phase5: drop redundant MTD collection/ops columns (Orders SoT)

Removes denormalized collection/email/attention from mtd_records. API projects
these from the linked order on read; writes go to orders only.

Dropped from mtd_records:
  received_eight_count_sheet, have_songs, collection_states, order_status,
  needs_attention, missing_data_email_sent_at, producer_email_sent_at,
  producer_email_sent_to

Revision ID: p5a6b7c8d9e0
Revises: p4a5b6c7d8e9
Create Date: 2026-10-19 21:20:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "p5a6b7c8d9e0"
down_revision: Union[str, Sequence[str], None] = "p4a5b6c7d8e9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Backfill Orders from MTD before drop (fill empty Order fields only).
    op.execute(
        """
        UPDATE orders o
        SET
          received_eight_count_sheet = COALESCE(
            NULLIF(BTRIM(o.received_eight_count_sheet), ''),
            NULLIF(BTRIM(m.received_eight_count_sheet), '')
          ),
          have_songs = COALESCE(
            NULLIF(BTRIM(o.have_songs), ''),
            NULLIF(BTRIM(m.have_songs), '')
          ),
          collection_states = COALESCE(o.collection_states, m.collection_states),
          order_status = COALESCE(
            NULLIF(BTRIM(o.order_status), ''),
            NULLIF(BTRIM(m.order_status), '')
          ),
          needs_attention = CASE
            WHEN o.needs_attention IS TRUE THEN TRUE
            ELSE COALESCE(m.needs_attention, FALSE)
          END,
          missing_data_email_sent_at = COALESCE(
            o.missing_data_email_sent_at, m.missing_data_email_sent_at
          ),
          producer_email_sent_at = COALESCE(
            o.producer_email_sent_at, m.producer_email_sent_at
          ),
          producer_email_sent_to = COALESCE(
            NULLIF(BTRIM(o.producer_email_sent_to), ''),
            NULLIF(BTRIM(m.producer_email_sent_to), '')
          )
        FROM mtd_records m
        WHERE m.order_id = o.id
        """
    )
    op.execute(
        "ALTER TABLE mtd_records DROP COLUMN IF EXISTS received_eight_count_sheet"
    )
    op.execute("ALTER TABLE mtd_records DROP COLUMN IF EXISTS have_songs")
    op.execute("ALTER TABLE mtd_records DROP COLUMN IF EXISTS collection_states")
    op.execute("ALTER TABLE mtd_records DROP COLUMN IF EXISTS order_status")
    op.execute("ALTER TABLE mtd_records DROP COLUMN IF EXISTS needs_attention")
    op.execute(
        "ALTER TABLE mtd_records DROP COLUMN IF EXISTS missing_data_email_sent_at"
    )
    op.execute(
        "ALTER TABLE mtd_records DROP COLUMN IF EXISTS producer_email_sent_at"
    )
    op.execute(
        "ALTER TABLE mtd_records DROP COLUMN IF EXISTS producer_email_sent_to"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE mtd_records ADD COLUMN IF NOT EXISTS received_eight_count_sheet VARCHAR DEFAULT '' NOT NULL"
    )
    op.execute(
        "ALTER TABLE mtd_records ADD COLUMN IF NOT EXISTS have_songs VARCHAR DEFAULT '' NOT NULL"
    )
    op.execute(
        "ALTER TABLE mtd_records ADD COLUMN IF NOT EXISTS collection_states JSON"
    )
    op.execute("ALTER TABLE mtd_records ADD COLUMN IF NOT EXISTS order_status VARCHAR")
    op.execute(
        "ALTER TABLE mtd_records ADD COLUMN IF NOT EXISTS needs_attention BOOLEAN DEFAULT FALSE NOT NULL"
    )
    op.execute(
        "ALTER TABLE mtd_records ADD COLUMN IF NOT EXISTS missing_data_email_sent_at TIMESTAMPTZ"
    )
    op.execute(
        "ALTER TABLE mtd_records ADD COLUMN IF NOT EXISTS producer_email_sent_at TIMESTAMPTZ"
    )
    op.execute(
        "ALTER TABLE mtd_records ADD COLUMN IF NOT EXISTS producer_email_sent_to VARCHAR"
    )
