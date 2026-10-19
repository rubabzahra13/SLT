"""phase3: drop redundant MTD identity columns (Orders SoT)

Removes denormalized identity from mtd_records. API projects these from the
linked order on read; writes go to orders only.

Dropped from mtd_records:
  category, editor_request, contact_name, program_name, package, music_theme

Revision ID: p3a4b5c6d7e8
Revises: p1a2b3c4d5e6
Create Date: 2026-10-19 15:40:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "p3a4b5c6d7e8"
down_revision: Union[str, Sequence[str], None] = "p1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE mtd_records DROP COLUMN IF EXISTS category")
    op.execute("ALTER TABLE mtd_records DROP COLUMN IF EXISTS editor_request")
    op.execute("ALTER TABLE mtd_records DROP COLUMN IF EXISTS contact_name")
    op.execute("ALTER TABLE mtd_records DROP COLUMN IF EXISTS program_name")
    op.execute("ALTER TABLE mtd_records DROP COLUMN IF EXISTS package")
    op.execute("ALTER TABLE mtd_records DROP COLUMN IF EXISTS music_theme")


def downgrade() -> None:
    op.execute(
        "ALTER TABLE mtd_records ADD COLUMN IF NOT EXISTS category VARCHAR NOT NULL DEFAULT 'Cheer'"
    )
    op.execute(
        "ALTER TABLE mtd_records ADD COLUMN IF NOT EXISTS editor_request VARCHAR"
    )
    op.execute(
        "ALTER TABLE mtd_records ADD COLUMN IF NOT EXISTS contact_name VARCHAR NOT NULL DEFAULT ''"
    )
    op.execute(
        "ALTER TABLE mtd_records ADD COLUMN IF NOT EXISTS program_name VARCHAR NOT NULL DEFAULT ''"
    )
    op.execute(
        "ALTER TABLE mtd_records ADD COLUMN IF NOT EXISTS package VARCHAR NOT NULL DEFAULT ''"
    )
    op.execute("ALTER TABLE mtd_records ADD COLUMN IF NOT EXISTS music_theme TEXT")
