import uuid
from sqlalchemy import Column, String, Boolean, Text, Numeric, DateTime, func, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class Order(Base):
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    legacy_id = Column(String, nullable=True, index=True)
    form_type = Column(String, default="school-all-star-cheer", nullable=False)
    cheer_form_subtype = Column(String, nullable=True)
    dance_form_subtype = Column(String, nullable=True)

    # Program & Address info
    school_program_name = Column(String, nullable=True)
    school_address = Column(Text, nullable=True)
    city = Column(String, nullable=True)
    state_province = Column(String, nullable=True)
    zip_postal_code = Column(String, nullable=True)
    country = Column(String, default="United States", nullable=True)
    division = Column(String, nullable=True)

    # Contacts
    coach_name = Column(String, nullable=True)
    coach_phone = Column(String, nullable=True)
    coach_email = Column(String, nullable=True)
    billing_person_name = Column(String, nullable=True)
    billing_person_email = Column(String, nullable=True)
    choreographer_name = Column(String, nullable=True)
    choreographer_email = Column(String, nullable=True)

    # Mix details
    number_of_copies = Column(String, nullable=True)
    package_type = Column(String, nullable=True)
    requested_editor = Column(String, nullable=True)
    time_length_of_mix = Column(String, nullable=True)
    music_affiliate = Column(String, nullable=True)
    power_music_covers = Column(Text, nullable=True)
    routine_notes = Column(Text, nullable=True)
    custom_voiceovers = Column(Text, nullable=True)

    # Form specific fields
    gym_name = Column(String, nullable=True)
    gym_billing_address = Column(Text, nullable=True)
    team_name = Column(String, nullable=True)
    team_coed_all_girl = Column(String, nullable=True)
    team_colors = Column(String, nullable=True)
    school_name = Column(String, nullable=True)
    school_billing_address = Column(Text, nullable=True)
    mascot = Column(String, nullable=True)
    split_or_no_split = Column(String, nullable=True)
    viroc_choreographer_name = Column(String, nullable=True)
    viroc_choreographer_email = Column(String, nullable=True)
    colors = Column(String, nullable=True)
    billing_address = Column(Text, nullable=True)
    coach_contact_full_name = Column(String, nullable=True)
    coach_email_address = Column(String, nullable=True)
    email_address = Column(String, nullable=True)
    sending_eight_count_sheets = Column(String, nullable=True)
    using_eight_count_sheets = Column(String, nullable=True)
    song_list_suggestions = Column(Text, nullable=True)
    coupon_code = Column(String, nullable=True)
    how_did_you_find_out = Column(String, nullable=True)

    # Normalized fields
    customer_name = Column(String, nullable=False)
    contact_name = Column(String, nullable=False)
    program_name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    package = Column(String, nullable=False)
    music_theme = Column(Text, nullable=True)
    editor_request = Column(String, nullable=True)
    requested_producer = Column(String, nullable=True)
    price = Column(Numeric(10, 2), nullable=False, default=0.0)
    price_compliance = Column(String, nullable=True)

    # Status & Timestamps
    status = Column(String, default="new", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    needs_attention = Column(Boolean, default=False, nullable=False)
    attention_reason = Column(Text, nullable=True)
    is_past_order = Column(Boolean, default=False, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # --- Pricing Engine Fields (populated at complete-pricing time) ---
    system_calculated_customer_price = Column(Numeric(10, 2), nullable=True)
    final_customer_price = Column(Numeric(10, 2), nullable=True)
    final_customer_price_overridden = Column(Boolean, default=False, nullable=False)
    # Full pricing breakdown JSON (PricingBreakdown serialized)
    pricing_breakdown = Column(JSON, nullable=True)

    # --- Payroll Fields (populated at finalize-payroll time) ---
    rate_used = Column(Numeric(5, 4), nullable=True)
    rate_source = Column(String, nullable=True)   # "default_rate" | "rates_by_category[jazz-kick]" | ...
    producer_payout = Column(Numeric(10, 2), nullable=True)
    slt_portion = Column(Numeric(10, 2), nullable=True)
    payroll_finalized = Column(Boolean, default=False, nullable=False)
    payroll_breakdown = Column(JSON, nullable=True)

    mtd_record = relationship("MTDRecord", back_populates="order", uselist=False)

