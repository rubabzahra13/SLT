"""rename eight_count_sheet → received_eight_count_sheet

Admin collection status (HAVE CS / NEED CS), distinct from Magento
sending_eight_count_sheets Yes/No intent. Rename on orders + mtd_records.

Revision ID: d6e7f8a9b0c1
Revises: c5d6e7f8a9b0
Create Date: 2026-10-15 15:44:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "d6e7f8a9b0c1"
down_revision: Union[str, Sequence[str], None] = "c5d6e7f8a9b0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _rename_if_needed(table: str) -> None:
    op.execute(
        f"""
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = '{table}'
              AND column_name = 'eight_count_sheet'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = '{table}'
              AND column_name = 'received_eight_count_sheet'
          ) THEN
            ALTER TABLE {table}
              RENAME COLUMN eight_count_sheet TO received_eight_count_sheet;
          ELSIF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = '{table}'
              AND column_name = 'eight_count_sheet'
          ) AND EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = '{table}'
              AND column_name = 'received_eight_count_sheet'
          ) THEN
            UPDATE {table}
            SET received_eight_count_sheet = COALESCE(
                  NULLIF(TRIM(received_eight_count_sheet), ''),
                  NULLIF(TRIM(eight_count_sheet), '')
                )
            WHERE NULLIF(TRIM(eight_count_sheet), '') IS NOT NULL;
            ALTER TABLE {table} DROP COLUMN eight_count_sheet;
          END IF;
        END $$;
        """
    )


def upgrade() -> None:
    _rename_if_needed("orders")
    _rename_if_needed("mtd_records")


def downgrade() -> None:
    for table in ("orders", "mtd_records"):
        op.execute(
            f"""
            DO $$
            BEGIN
              IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = '{table}'
                  AND column_name = 'received_eight_count_sheet'
              ) AND NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = '{table}'
                  AND column_name = 'eight_count_sheet'
              ) THEN
                ALTER TABLE {table}
                  RENAME COLUMN received_eight_count_sheet TO eight_count_sheet;
              END IF;
            END $$;
            """
        )
