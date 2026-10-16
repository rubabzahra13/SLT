"""add music_affiliate_options catalog table

Per form_type + subtype SoftSelect / compliance affiliate options,
edited from Pricing Reference and used for order intake matching.

Revision ID: k8l9m0n1o2p3
Revises: j6k7l8m9n0o1
Create Date: 2026-10-16 03:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "k8l9m0n1o2p3"
# Current deployed DB head. Idempotent upgrade (IF NOT EXISTS) so this can
# land beside other branches until a merge revision is cut.
down_revision: Union[str, Sequence[str], None] = "j6k7l8m9n0o1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS music_affiliate_options (
          id UUID PRIMARY KEY,
          form_type VARCHAR NOT NULL,
          subtype_id VARCHAR NOT NULL DEFAULT '',
          option_key VARCHAR NOT NULL,
          label VARCHAR NOT NULL,
          is_compliant BOOLEAN NOT NULL DEFAULT true,
          enabled BOOLEAN NOT NULL DEFAULT true,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          CONSTRAINT uq_music_affiliate_options_form_subtype_key
            UNIQUE (form_type, subtype_id, option_key)
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_music_affiliate_options_form_type "
        "ON music_affiliate_options (form_type)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_music_affiliate_options_subtype_id "
        "ON music_affiliate_options (subtype_id)"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS music_affiliate_options CASCADE")
