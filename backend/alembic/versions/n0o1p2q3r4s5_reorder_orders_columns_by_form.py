"""reorder orders columns by form field groups

Groups related columns consecutively so Supabase browsing makes
cross-fills (addresses, colors, form identity) obvious.

Revision ID: n0o1p2q3r4s5
Revises: m9n0o1p2q3r4
Create Date: 2026-10-14 22:10:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "n0o1p2q3r4s5"
down_revision: Union[str, Sequence[str], None] = "m9n0o1p2q3r4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Column order for the rebuilt table (logical groups).
ORDERED_COLUMNS = """
    -- 1. Identity / form category
    id UUID PRIMARY KEY,
    form_type VARCHAR NOT NULL,
    cheer_form_subtype VARCHAR,
    dance_form_subtype VARCHAR,
    varsity_viroc_customer VARCHAR,
    category VARCHAR,
    program_name VARCHAR,

    -- 2. Form identity names
    gym_name VARCHAR,
    school_name VARCHAR,
    school_program_name VARCHAR,
    team_name VARCHAR,

    -- 3. All addresses / billing (form-specific) + shared location
    gym_billing_address TEXT,
    school_billing_address TEXT,
    youth_rec_billing_address TEXT,
    organization_billing_address TEXT,
    school_address TEXT,
    city VARCHAR,
    state_province VARCHAR,
    zip_postal_code VARCHAR,
    country VARCHAR,

    -- 4. Colors (form-specific)
    team_colors VARCHAR,
    youth_rec_colors VARCHAR,
    school_program_colors VARCHAR,

    -- 5. Team / school specifics
    team_coed_all_girl VARCHAR,
    mascot VARCHAR,
    division VARCHAR,
    split_or_no_split VARCHAR,
    nicknames TEXT,

    -- 6. Contacts
    coach_name VARCHAR,
    coach_phone VARCHAR,
    coach_email VARCHAR,
    coach_contact_full_name VARCHAR,
    coach_email_address VARCHAR,
    email_address VARCHAR,
    billing_person_name VARCHAR,
    billing_person_email VARCHAR,
    choreographer_name VARCHAR,
    choreographer_email VARCHAR,
    viroc_choreographer_name VARCHAR,
    viroc_choreographer_email VARCHAR,
    customer_name VARCHAR,
    contact_name VARCHAR,

    -- 7. Mix / songs / voiceovers
    package_type VARCHAR,
    package VARCHAR,
    time_length_of_mix VARCHAR,
    number_of_copies VARCHAR,
    music_affiliate VARCHAR,
    music_affiliate_selections TEXT,
    affiliate_flag_status VARCHAR,
    song_list_suggestions TEXT,
    power_music_covers TEXT,
    routine_notes TEXT,
    music_theme TEXT,
    custom_voiceovers TEXT,
    voiceover_script TEXT,
    pronunciation_guidance TEXT,
    sending_eight_count_sheets VARCHAR,
    using_eight_count_sheets VARCHAR,
    eight_count_sheet VARCHAR,
    have_songs VARCHAR,
    style VARCHAR,
    licensing_required VARCHAR,
    instrumentation_notes TEXT,
    lyrical_notes TEXT,
    is_rush_order VARCHAR,
    vocals_preference VARCHAR,
    instrumental_style_preference TEXT,
    coupon_code VARCHAR,
    how_did_you_find_out VARCHAR,
    requested_editor VARCHAR,
    editor_request VARCHAR,
    requested_producer VARCHAR,

    -- 8. Assignment / schedule
    assigned_producer VARCHAR,
    assigned_producer_id UUID,
    mix_start_date VARCHAR,
    mix_end_date VARCHAR,
    is_reassigned BOOLEAN DEFAULT false,

    -- 9. Status / workflow / merge / email
    status VARCHAR NOT NULL,
    order_status VARCHAR,
    collection_states JSON,
    needs_attention BOOLEAN NOT NULL DEFAULT false,
    attention_reason TEXT,
    is_past_order BOOLEAN NOT NULL DEFAULT false,
    is_manual_entry BOOLEAN NOT NULL DEFAULT false,
    is_placeholder BOOLEAN DEFAULT false,
    matched_order_id UUID,
    match_score NUMERIC,
    match_status VARCHAR DEFAULT 'unmatched',
    merged_form_order_id VARCHAR,
    merged_into_manual_order_id VARCHAR,
    manual_overlap_snapshot JSON,
    suppress_manual_form_merge BOOLEAN NOT NULL DEFAULT false,
    missing_data_email_sent_at TIMESTAMPTZ,
    producer_email_sent_at TIMESTAMPTZ,
    producer_email_sent_to VARCHAR,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- 10. Pricing / payroll
    price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    price_compliance VARCHAR,
    system_calculated_customer_price NUMERIC(10, 2),
    final_customer_price NUMERIC(10, 2),
    final_customer_price_overridden BOOLEAN NOT NULL DEFAULT false,
    pricing_breakdown JSON,
    rate_used NUMERIC(5, 4),
    rate_source VARCHAR,
    producer_payout NUMERIC(10, 2),
    slt_portion NUMERIC(10, 2),
    payroll_finalized BOOLEAN NOT NULL DEFAULT false,
    payroll_breakdown JSON
"""

SELECT_LIST = """
    id, form_type, cheer_form_subtype, dance_form_subtype, varsity_viroc_customer,
    category, program_name,
    gym_name, school_name, school_program_name, team_name,
    gym_billing_address, school_billing_address, youth_rec_billing_address,
    organization_billing_address, school_address,
    city, state_province, zip_postal_code, country,
    team_colors, youth_rec_colors, school_program_colors,
    team_coed_all_girl, mascot, division, split_or_no_split, nicknames,
    coach_name, coach_phone, coach_email, coach_contact_full_name,
    coach_email_address, email_address,
    billing_person_name, billing_person_email,
    choreographer_name, choreographer_email,
    viroc_choreographer_name, viroc_choreographer_email,
    customer_name, contact_name,
    package_type, package, time_length_of_mix, number_of_copies,
    music_affiliate, music_affiliate_selections, affiliate_flag_status,
    song_list_suggestions, power_music_covers, routine_notes, music_theme,
    custom_voiceovers, voiceover_script, pronunciation_guidance,
    sending_eight_count_sheets, using_eight_count_sheets, eight_count_sheet, have_songs,
    style, licensing_required, instrumentation_notes, lyrical_notes, is_rush_order,
    vocals_preference, instrumental_style_preference,
    coupon_code, how_did_you_find_out,
    requested_editor, editor_request, requested_producer,
    assigned_producer, assigned_producer_id, mix_start_date, mix_end_date, is_reassigned,
    status, order_status, collection_states, needs_attention, attention_reason,
    is_past_order, is_manual_entry, is_placeholder,
    matched_order_id, match_score, match_status,
    merged_form_order_id, merged_into_manual_order_id, manual_overlap_snapshot,
    suppress_manual_form_merge,
    missing_data_email_sent_at, producer_email_sent_at, producer_email_sent_to,
    created_at, completed_at, updated_at,
    price, price_compliance,
    system_calculated_customer_price, final_customer_price,
    final_customer_price_overridden, pricing_breakdown,
    rate_used, rate_source, producer_payout, slt_portion,
    payroll_finalized, payroll_breakdown
"""


def upgrade() -> None:
    # Drop inbound FKs so we can swap the table.
    op.execute(
        """
        ALTER TABLE mtd_records DROP CONSTRAINT IF EXISTS mtd_records_order_id_fkey
        """
    )
    op.execute(
        """
        ALTER TABLE payroll_addons DROP CONSTRAINT IF EXISTS payroll_addons_order_id_fkey
        """
    )
    op.execute(
        """
        ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_assigned_producer_id_fkey
        """
    )

    op.execute(f"CREATE TABLE orders_reordered ({ORDERED_COLUMNS})")
    op.execute(
        f"""
        INSERT INTO orders_reordered ({SELECT_LIST})
        SELECT {SELECT_LIST}
        FROM orders
        """
    )

    op.execute("DROP TABLE orders CASCADE")
    op.execute("ALTER TABLE orders_reordered RENAME TO orders")

    # Indexes + FKs
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_orders_assigned_producer_id "
        "ON orders (assigned_producer_id)"
    )
    op.execute(
        """
        ALTER TABLE orders
        ADD CONSTRAINT orders_assigned_producer_id_fkey
        FOREIGN KEY (assigned_producer_id) REFERENCES producers(id) ON DELETE SET NULL
        """
    )
    op.execute(
        """
        ALTER TABLE mtd_records
        ADD CONSTRAINT mtd_records_order_id_fkey
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
        """
    )
    op.execute(
        """
        ALTER TABLE payroll_addons
        ADD CONSTRAINT payroll_addons_order_id_fkey
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
        """
    )

    # Supabase roles (best-effort; ignore if role missing).
    op.execute(
        """
        DO $$
        BEGIN
          GRANT ALL ON TABLE orders TO anon, authenticated, service_role, postgres;
          ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
        EXCEPTION WHEN undefined_object THEN
          NULL;
        END $$;
        """
    )


def downgrade() -> None:
    # Column order is cosmetic — no reverse rebuild.
    pass
