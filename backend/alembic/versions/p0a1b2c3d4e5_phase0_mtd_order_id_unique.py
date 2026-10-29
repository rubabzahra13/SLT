"""phase0: repair mtd↔order links + unique order_id

Integrity-only. Does not drop columns.

- Delete empty junk MTD rows (no order_id, blank identity fields)
- Create missing MTD rows for orders with status = 'in_mtd'
- Enforce at most one MTD row per order via unique partial index

Revision ID: p0a1b2c3d4e5
Revises: k8l9m0n1o2p3
Create Date: 2026-10-19 11:40:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "p0a1b2c3d4e5"
down_revision: Union[str, Sequence[str], None] = "k8l9m0n1o2p3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) Empty shell MTD rows with no order link: not recoverable identity.
    op.execute(
        """
        DELETE FROM mtd_records
        WHERE order_id IS NULL
          AND COALESCE(TRIM(program_name), '') = ''
          AND COALESCE(TRIM(contact_name), '') = ''
          AND COALESCE(TRIM(package), '') = '';
        """
    )

    # 2) Orders marked in_mtd but missing an MTD row: recreate from order SoT.
    op.execute(
        """
        INSERT INTO mtd_records (
          id,
          order_id,
          section,
          assigned_producer_id,
          category,
          editor_request,
          contact_name,
          editor_initials,
          program_name,
          package,
          music_theme,
          price,
          price_compliance,
          invoice,
          mix_start_date,
          mix_end_date,
          received_eight_count_sheet,
          have_songs,
          collection_states,
          order_status,
          needs_attention,
          status,
          record_status,
          in_mtd,
          is_reassigned,
          in_payroll,
          is_manual_schedule_entry,
          has_rally_mix,
          has_extend_8ct_addon,
          has_processing_8ct_sheets_addon,
          final_customer_price_overridden,
          payroll_finalized,
          missing_data_email_sent_at,
          producer_email_sent_at,
          producer_email_sent_to,
          created_at,
          updated_at
        )
        SELECT
          gen_random_uuid(),
          o.id,
          CASE o.form_type
            WHEN 'school-all-star-dance' THEN 'DANCE MUSIC'
            WHEN 'marching-band' THEN 'MARCHING BAND'
            WHEN 'sports-entertainment' THEN 'SPORTS ENTERTAINMENT'
            WHEN 'school-anthem' THEN 'SCHOOL ANTHEMS'
            ELSE 'CHEERLEADING MUSIC'
          END,
          o.assigned_producer_id,
          CASE o.form_type
            WHEN 'school-all-star-dance' THEN 'Dance'
            WHEN 'marching-band' THEN 'Marching Band'
            WHEN 'sports-entertainment' THEN 'Sports Entertainment'
            WHEN 'school-anthem' THEN 'School Anthem'
            ELSE 'Cheer'
          END,
          o.editor_initials,
          COALESCE(
            NULLIF(TRIM(o.contact_name), ''),
            NULLIF(TRIM(o.coach_name), ''),
            NULLIF(TRIM(o.customer_name), ''),
            ''
          ),
          COALESCE(o.assigned_producer, o.editor_initials),
          COALESCE(NULLIF(TRIM(o.school_gym_name), ''), ''),
          COALESCE(NULLIF(TRIM(o.package), ''), ''),
          o.music_theme,
          COALESCE(o.price, 0),
          COALESCE(NULLIF(TRIM(o.price_compliance), ''), 'compliant'),
          '',
          CASE
            WHEN o.mix_start_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
              THEN o.mix_start_date::date
            ELSE NULL
          END,
          CASE
            WHEN o.mix_end_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
              THEN o.mix_end_date::date
            ELSE NULL
          END,
          COALESCE(o.received_eight_count_sheet, ''),
          COALESCE(o.have_songs, ''),
          o.collection_states,
          o.order_status,
          COALESCE(o.needs_attention, false),
          'active',
          'Ongoing',
          true,
          COALESCE(o.is_reassigned, false),
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          o.missing_data_email_sent_at,
          o.producer_email_sent_at,
          o.producer_email_sent_to,
          now(),
          now()
        FROM orders o
        WHERE o.status = 'in_mtd'
          AND NOT EXISTS (
            SELECT 1 FROM mtd_records m WHERE m.order_id = o.id
          );
        """
    )

    # 3) At most one MTD row per order (NULLs still allowed for rare orphans).
    op.execute("DROP INDEX IF EXISTS ix_mtd_records_order_id")
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_mtd_records_order_id
        ON mtd_records (order_id)
        WHERE order_id IS NOT NULL
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_mtd_records_order_id")
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_mtd_records_order_id
        ON mtd_records (order_id)
        """
    )
