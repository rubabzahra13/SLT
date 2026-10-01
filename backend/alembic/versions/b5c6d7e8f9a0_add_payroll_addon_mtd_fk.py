"""Add FK from payroll_addons.mtd_id → mtd_records.id

Revision ID: b5c6d7e8f9a0
Revises: a4b5c6d7e8f9
Create Date: 2026-10-01 17:30:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "b5c6d7e8f9a0"
down_revision: Union[str, Sequence[str], None] = "a4b5c6d7e8f9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop orphan references before adding the constraint.
    op.execute(
        """
        UPDATE payroll_addons
        SET mtd_id = NULL
        WHERE mtd_id IS NOT NULL
          AND mtd_id NOT IN (SELECT id FROM mtd_records)
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'payroll_addons_mtd_id_fkey'
          ) THEN
            ALTER TABLE payroll_addons
              ADD CONSTRAINT payroll_addons_mtd_id_fkey
              FOREIGN KEY (mtd_id) REFERENCES mtd_records(id) ON DELETE SET NULL;
          END IF;
        END $$;
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_payroll_addons_mtd_id ON payroll_addons (mtd_id);"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE payroll_addons DROP CONSTRAINT IF EXISTS payroll_addons_mtd_id_fkey;")
    op.execute("DROP INDEX IF EXISTS ix_payroll_addons_mtd_id;")
