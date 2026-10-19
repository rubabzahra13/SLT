from __future__ import annotations

import uuid
from typing import Optional
from sqlalchemy import Column, String, Boolean, Text, Numeric, DateTime, ForeignKey, func, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class Order(Base):
    """Orders table — columns grouped by form field family for easier auditing.

    Physical DB column order matches these groups (see migration n0o1p2q3r4s5).

    Source of truth for customer-submitted / form intake data and for pricing /
    producer-payout fields (Phase 2). Optional 1:1 ``mtd_record`` holds board +
    payroll lifecycle flags; pricing values may be mirrored onto MTD for display
    only (see MTDRecord).
    """

    __tablename__ = "orders"

    # --- 1. Identity / form category (SoT: form_type + subtypes) ---
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    form_type = Column(String, default="school-all-star-cheer", nullable=False)
    cheer_form_subtype = Column(String, nullable=True)
    dance_form_subtype = Column(String, nullable=True)
    varsity_viroc_customer = Column(String, nullable=True)
    # category + program_name removed — derived via @property (see below)

    # --- 2. Form identity names ---
    # school_gym_name = gym / school / program / org (one column; UI label varies by form)
    school_gym_name = Column(String, nullable=True)
    team_name = Column(String, nullable=True)

    # --- 3. Address / billing (one column; UI label varies by form) ---
    # School/Gym Billing Address — also Gym Billing, School Billing, Billing Address,
    # Organization Billing, School/Gym Address.
    school_gym_billing_address = Column(Text, nullable=True)
    city = Column(String, nullable=True)
    state_province = Column(String, nullable=True)
    zip_postal_code = Column(String, nullable=True)
    country = Column(String, default="United States", nullable=True)

    # --- 4. Colors (one column; UI label varies by form) ---
    colors = Column(String, nullable=True)

    # --- 5. Team / school specifics ---
    team_coed_all_girl = Column(String, nullable=True)
    mascot = Column(String, nullable=True)
    division = Column(String, nullable=True)
    split_or_no_split = Column(String, nullable=True)
    nicknames = Column(Text, nullable=True)

    # --- 6. Contacts ---
    # coach_name / coach_email are SoT; Magento "Coach (full name)" /
    # "Coach Email Address" are aliases (Youth Rec field keys).
    coach_name = Column(String, nullable=True)
    coach_phone = Column(String, nullable=True)
    coach_email = Column(String, nullable=True)
    # Youth Rec Magento second email — distinct from coach_email.
    youth_rec_extra_email_address = Column(String, nullable=True)
    billing_person_name = Column(String, nullable=True)
    billing_person_email = Column(String, nullable=True)
    # choreographer_name / choreographer_email are SoT; Magento
    # "V!ROC Choreographer (full name/email)" are aliases.
    choreographer_name = Column(String, nullable=True)
    choreographer_email = Column(String, nullable=True)
    customer_name = Column(String, nullable=True)
    contact_name = Column(String, nullable=True)

    # --- 7. Mix / songs / voiceovers ---
    package_type = Column(String, nullable=True)
    package = Column(String, nullable=True)
    time_length_of_mix = Column(String, nullable=True)
    number_of_copies = Column(String, nullable=True)
    music_affiliate = Column(String, nullable=True)
    music_affiliate_selections = Column(Text, nullable=True)
    affiliate_flag_status = Column(String, nullable=True)
    song_list_suggestions = Column(Text, nullable=True)
    power_music_covers = Column(Text, nullable=True)
    # Dance Magento "Unleash the Beats Covers" — not song_list_suggestions.
    unleash_the_beats_covers = Column(Text, nullable=True)
    routine_notes = Column(Text, nullable=True)
    music_theme = Column(Text, nullable=True)
    custom_voiceovers = Column(Text, nullable=True)
    voiceover_script = Column(Text, nullable=True)
    pronunciation_guidance = Column(Text, nullable=True)
    # Magento Yes/No for 8-count sheets (sending / using labels — one SoT).
    # using_eight_count_sheets is a legacy API alias of the same value.
    sending_eight_count_sheets = Column(String, nullable=True)
    # Admin collection status (HAVE CS / NEED CS) — client sheets received?
    received_eight_count_sheet = Column(String, nullable=True)
    have_songs = Column(String, nullable=True)
    style = Column(String, nullable=True)
    licensing_required = Column(String, nullable=True)
    # Marching Band instrumentation notes / School Anthem style preference — one SoT.
    # instrumental_style_preference is a legacy API alias of the same value.
    instrumentation_notes = Column(Text, nullable=True)
    lyrical_notes = Column(Text, nullable=True)
    is_rush_order = Column(String, nullable=True)
    # Sports Ent Magento client rush answer (not admin board Rush order).
    client_requested_rush_order = Column(String, nullable=True)
    vocals_preference = Column(String, nullable=True)
    coupon_code = Column(String, nullable=True)
    how_did_you_find_out = Column(String, nullable=True)
    # requested_editor is Magento SoT ("Requested Editor/Producer").
    # requested_producer is a legacy API alias of the same value.
    # editor_initials is the short request code (FA / producer initials).
    requested_editor = Column(String, nullable=True)
    editor_initials = Column(String, nullable=True)

    # --- 8. Assignment / schedule ---
    assigned_producer = Column(String, nullable=True)
    assigned_producer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("producers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    mix_start_date = Column(String, nullable=True)
    mix_end_date = Column(String, nullable=True)
    # Sports Ent Magento client-requested due date (not admin Mix Due Date).
    client_requested_mix_due_date = Column(String, nullable=True)
    is_reassigned = Column(Boolean, default=False, nullable=False)

    # --- 9. Status / workflow / merge / email ---
    status = Column(String, default="new", nullable=False)
    order_status = Column(String, nullable=True)
    collection_states = Column(JSON, nullable=True)
    needs_attention = Column(Boolean, default=False, nullable=False)
    attention_reason = Column(Text, nullable=True)
    is_past_order = Column(Boolean, default=False, nullable=False)
    is_manual_entry = Column(Boolean, default=False, nullable=False)
    is_placeholder = Column(Boolean, default=False, nullable=True)
    matched_order_id = Column(UUID(as_uuid=True), nullable=True)
    match_score = Column(Numeric, nullable=True)
    match_status = Column(String, nullable=True)
    merged_form_order_id = Column(String, nullable=True)
    merged_into_manual_order_id = Column(String, nullable=True)
    manual_overlap_snapshot = Column(JSON, nullable=True)
    suppress_manual_form_merge = Column(Boolean, default=False, nullable=False)
    missing_data_email_sent_at = Column(DateTime(timezone=True), nullable=True)
    producer_email_sent_at = Column(DateTime(timezone=True), nullable=True)
    producer_email_sent_to = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # --- 10. Pricing / payroll ---
    price = Column(Numeric(10, 2), nullable=False, default=0.0)
    price_compliance = Column(String, nullable=True)
    system_calculated_customer_price = Column(Numeric(10, 2), nullable=True)
    final_customer_price = Column(Numeric(10, 2), nullable=True)
    final_customer_price_overridden = Column(Boolean, default=False, nullable=False)
    pricing_breakdown = Column(JSON, nullable=True)
    rate_used = Column(Numeric(5, 4), nullable=True)
    rate_source = Column(String, nullable=True)
    producer_payout = Column(Numeric(10, 2), nullable=True)

    mtd_record = relationship("MTDRecord", back_populates="order", uselist=False)

    @property
    def category(self) -> str:
        from app.order_identity import category_from_form_type

        return category_from_form_type(self.form_type)

    @property
    def program_name(self) -> str:
        """Display/MTD alias of the form identity name — not a stored column."""
        from app.order_identity import order_identity_name

        return order_identity_name(self)

    @program_name.setter
    def program_name(self, value: Optional[str]) -> None:
        self.school_gym_name = value

    @property
    def school_name(self) -> Optional[str]:
        """API alias — same stored value as school_gym_name."""
        return self.school_gym_name

    @school_name.setter
    def school_name(self, value: Optional[str]) -> None:
        self.school_gym_name = value

    @property
    def gym_name(self) -> Optional[str]:
        """API alias — same stored value as school_gym_name."""
        return self.school_gym_name

    @gym_name.setter
    def gym_name(self, value: Optional[str]) -> None:
        self.school_gym_name = value

    @property
    def school_program_name(self) -> Optional[str]:
        """API alias — same stored value as school_gym_name."""
        return self.school_gym_name

    @school_program_name.setter
    def school_program_name(self, value: Optional[str]) -> None:
        self.school_gym_name = value

    @property
    def gym_billing_address(self) -> Optional[str]:
        return self.school_gym_billing_address

    @gym_billing_address.setter
    def gym_billing_address(self, value: Optional[str]) -> None:
        self.school_gym_billing_address = value

    @property
    def school_billing_address(self) -> Optional[str]:
        return self.school_gym_billing_address

    @school_billing_address.setter
    def school_billing_address(self, value: Optional[str]) -> None:
        self.school_gym_billing_address = value

    @property
    def youth_rec_billing_address(self) -> Optional[str]:
        return self.school_gym_billing_address

    @youth_rec_billing_address.setter
    def youth_rec_billing_address(self, value: Optional[str]) -> None:
        self.school_gym_billing_address = value

    @property
    def organization_billing_address(self) -> Optional[str]:
        return self.school_gym_billing_address

    @organization_billing_address.setter
    def organization_billing_address(self, value: Optional[str]) -> None:
        self.school_gym_billing_address = value

    @property
    def school_address(self) -> Optional[str]:
        return self.school_gym_billing_address

    @school_address.setter
    def school_address(self, value: Optional[str]) -> None:
        self.school_gym_billing_address = value

    @property
    def team_colors(self) -> Optional[str]:
        return self.colors

    @team_colors.setter
    def team_colors(self, value: Optional[str]) -> None:
        self.colors = value

    @property
    def youth_rec_colors(self) -> Optional[str]:
        return self.colors

    @youth_rec_colors.setter
    def youth_rec_colors(self, value: Optional[str]) -> None:
        self.colors = value

    @property
    def school_program_colors(self) -> Optional[str]:
        return self.colors

    @school_program_colors.setter
    def school_program_colors(self, value: Optional[str]) -> None:
        self.colors = value

    @property
    def coach_contact_full_name(self) -> Optional[str]:
        return self.coach_name

    @coach_contact_full_name.setter
    def coach_contact_full_name(self, value: Optional[str]) -> None:
        self.coach_name = value

    @property
    def viroc_choreographer_name(self) -> Optional[str]:
        """API alias — same stored value as choreographer_name."""
        return self.choreographer_name

    @viroc_choreographer_name.setter
    def viroc_choreographer_name(self, value: Optional[str]) -> None:
        self.choreographer_name = value

    @property
    def viroc_choreographer_email(self) -> Optional[str]:
        """API alias — same stored value as choreographer_email."""
        return self.choreographer_email

    @viroc_choreographer_email.setter
    def viroc_choreographer_email(self, value: Optional[str]) -> None:
        self.choreographer_email = value

    @property
    def using_eight_count_sheets(self) -> Optional[str]:
        """API alias — same stored value as sending_eight_count_sheets."""
        return self.sending_eight_count_sheets

    @using_eight_count_sheets.setter
    def using_eight_count_sheets(self, value: Optional[str]) -> None:
        self.sending_eight_count_sheets = value

    @property
    def instrumental_style_preference(self) -> Optional[str]:
        """API alias — same stored value as instrumentation_notes."""
        return self.instrumentation_notes

    @instrumental_style_preference.setter
    def instrumental_style_preference(self, value: Optional[str]) -> None:
        self.instrumentation_notes = value

    @property
    def requested_producer(self) -> Optional[str]:
        """API alias — same stored value as requested_editor."""
        return self.requested_editor

    @requested_producer.setter
    def requested_producer(self, value: Optional[str]) -> None:
        self.requested_editor = value

    @property
    def editor_request(self) -> Optional[str]:
        """API alias — same stored value as editor_initials."""
        return self.editor_initials

    @editor_request.setter
    def editor_request(self, value: Optional[str]) -> None:
        self.editor_initials = value

    @property
    def coach_email_address(self) -> Optional[str]:
        return self.coach_email

    @coach_email_address.setter
    def coach_email_address(self, value: Optional[str]) -> None:
        self.coach_email = value

    @property
    def email_address(self) -> Optional[str]:
        """API alias — same stored value as youth_rec_extra_email_address."""
        return self.youth_rec_extra_email_address

    @email_address.setter
    def email_address(self, value: Optional[str]) -> None:
        self.youth_rec_extra_email_address = value
