from pydantic import BaseModel, ConfigDict, model_validator
from typing import Optional, Any, Any as TypingAny
from uuid import UUID
from datetime import datetime


def _orm_to_aliased_dict(obj: TypingAny) -> dict:
    """Map unified school_gym_* columns onto legacy API field names."""
    data: dict = {}
    # Use mapper attribute keys so renamed DB columns (e.g. received_* →
    # eight_count_sheet) still populate the API field names.
    try:
        from sqlalchemy import inspect as sa_inspect

        mapper = sa_inspect(type(obj))
        for attr in mapper.column_attrs:
            data[attr.key] = getattr(obj, attr.key, None)
    except Exception:
        for col in obj.__table__.columns:
            data[col.name] = getattr(obj, col.name, None)

    name = data.get("school_gym_name")
    billing = data.get("school_gym_billing_address")
    colors = data.get("colors")
    youth_email = data.get("youth_rec_extra_email_address")

    data["school_program_name"] = name
    data["program_name"] = name
    data["school_name"] = name
    data["gym_name"] = name
    data["school_billing_address"] = billing
    data["billing_address"] = billing
    data["gym_billing_address"] = billing
    data["school_address"] = billing
    data["team_colors"] = colors
    data["email_address"] = youth_email
    data["coach_contact_full_name"] = data.get("coach_name")
    data["coach_email_address"] = data.get("coach_email")
    data["viroc_choreographer_name"] = data.get("choreographer_name")
    data["viroc_choreographer_email"] = data.get("choreographer_email")
    data["editor_request"] = data.get("editor_initials")
    data["requested_producer"] = data.get("assigned_producer")
    # using_* was merged into sending_*
    data["using_eight_count_sheets"] = data.get("sending_eight_count_sheets")
    # received_* is the DB name; API keeps eight_count_sheet
    data["received_eight_count_sheet"] = data.get("eight_count_sheet")
    data["legacy_id"] = str(data.get("id")) if data.get("id") is not None else None
    data["category"] = None
    return data


class OrderSchema(BaseModel):
    id: UUID
    legacy_id: Optional[str] = None
    form_type: Optional[str] = "school-all-star-cheer"
    cheer_form_subtype: Optional[str] = None
    dance_form_subtype: Optional[str] = None
    varsity_viroc_customer: Optional[str] = None

    school_gym_name: Optional[str] = None
    school_gym_billing_address: Optional[str] = None
    # Legacy aliases (filled from school_gym_* for FE compat)
    school_program_name: Optional[str] = None
    school_address: Optional[str] = None
    city: Optional[str] = None
    state_province: Optional[str] = None
    zip_postal_code: Optional[str] = None
    country: Optional[str] = "United States"
    division: Optional[str] = None

    coach_name: Optional[str] = None
    coach_phone: Optional[str] = None
    coach_email: Optional[str] = None
    billing_person_name: Optional[str] = None
    billing_person_email: Optional[str] = None
    choreographer_name: Optional[str] = None
    choreographer_email: Optional[str] = None

    number_of_copies: Optional[str] = None
    package_type: Optional[str] = None
    requested_editor: Optional[str] = None
    time_length_of_mix: Optional[str] = None
    music_affiliate: Optional[str] = None
    affiliate_flag_status: Optional[str] = None
    music_affiliate_selections: Optional[str] = None
    power_music_covers: Optional[str] = None
    routine_notes: Optional[str] = None
    custom_voiceovers: Optional[str] = None
    voiceover_script: Optional[str] = None
    pronunciation_guidance: Optional[str] = None
    style: Optional[str] = None
    licensing_required: Optional[str] = None
    instrumentation_notes: Optional[str] = None
    lyrical_notes: Optional[str] = None
    is_rush_order: Optional[str] = None
    nicknames: Optional[str] = None
    vocals_preference: Optional[str] = None
    instrumental_style_preference: Optional[str] = None

    gym_name: Optional[str] = None
    gym_billing_address: Optional[str] = None
    team_name: Optional[str] = None
    team_coed_all_girl: Optional[str] = None
    team_colors: Optional[str] = None
    school_name: Optional[str] = None
    school_billing_address: Optional[str] = None
    mascot: Optional[str] = None
    split_or_no_split: Optional[str] = None
    viroc_choreographer_name: Optional[str] = None
    viroc_choreographer_email: Optional[str] = None
    colors: Optional[str] = None
    billing_address: Optional[str] = None
    coach_contact_full_name: Optional[str] = None
    coach_email_address: Optional[str] = None
    email_address: Optional[str] = None
    youth_rec_extra_email_address: Optional[str] = None
    sending_eight_count_sheets: Optional[str] = None
    using_eight_count_sheets: Optional[str] = None
    song_list_suggestions: Optional[str] = None
    coupon_code: Optional[str] = None
    how_did_you_find_out: Optional[str] = None
    collection_states: Optional[Any] = None
    order_status: Optional[str] = None
    assigned_producer: Optional[str] = None
    assigned_producer_id: Optional[UUID] = None
    mix_start_date: Optional[str] = None
    mix_end_date: Optional[str] = None
    eight_count_sheet: Optional[str] = None
    have_songs: Optional[str] = None
    editor_initials: Optional[str] = None
    client_requested_mix_due_date: Optional[str] = None
    client_requested_rush_order: Optional[str] = None

    customer_name: Optional[str] = None
    contact_name: Optional[str] = None
    program_name: Optional[str] = None
    category: Optional[str] = None
    package: Optional[str] = None
    music_theme: Optional[str] = None
    editor_request: Optional[str] = None
    requested_producer: Optional[str] = None
    price: float = 0.0
    price_compliance: Optional[str] = None
    system_calculated_customer_price: Optional[float] = None
    final_customer_price: Optional[float] = None
    final_customer_price_overridden: bool = False
    status: str = "new"
    created_at: datetime
    completed_at: Optional[datetime] = None
    needs_attention: bool = False
    attention_reason: Optional[str] = None
    is_past_order: bool = False
    is_reassigned: bool = False
    is_manual_entry: bool = False
    merged_form_order_id: Optional[str] = None
    merged_into_manual_order_id: Optional[str] = None
    manual_overlap_snapshot: Optional[Any] = None
    suppress_manual_form_merge: bool = False
    missing_data_email_sent_at: Optional[datetime] = None
    producer_email_sent_at: Optional[datetime] = None
    producer_email_sent_to: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def _expand_unified_columns(cls, data: Any) -> Any:
        if hasattr(data, "__table__"):
            return _orm_to_aliased_dict(data)
        return data


class OrderCreateSchema(BaseModel):
    customer_name: Optional[str] = None
    contact_name: Optional[str] = None
    program_name: Optional[str] = None
    category: Optional[str] = "Cheer"
    package: Optional[str] = "Standard"
    price: float = 0.0
    music_theme: Optional[str] = None
    editor_request: Optional[str] = "FA"
    requested_producer: Optional[str] = None
    requested_editor: Optional[str] = "FA"
    form_type: Optional[str] = "school-all-star-cheer"
    cheer_form_subtype: Optional[str] = None
    dance_form_subtype: Optional[str] = None
    varsity_viroc_customer: Optional[str] = None
    status: Optional[str] = "new"
    is_reassigned: Optional[bool] = False

    school_gym_name: Optional[str] = None
    school_gym_billing_address: Optional[str] = None
    school_program_name: Optional[str] = None
    school_address: Optional[str] = None
    city: Optional[str] = None
    state_province: Optional[str] = None
    zip_postal_code: Optional[str] = None
    country: Optional[str] = "United States"
    division: Optional[str] = None

    coach_name: Optional[str] = None
    coach_phone: Optional[str] = None
    coach_email: Optional[str] = None
    billing_person_name: Optional[str] = None
    billing_person_email: Optional[str] = None
    choreographer_name: Optional[str] = None
    choreographer_email: Optional[str] = None

    number_of_copies: Optional[str] = None
    package_type: Optional[str] = None
    time_length_of_mix: Optional[str] = None
    music_affiliate: Optional[str] = None
    affiliate_flag_status: Optional[str] = None
    music_affiliate_selections: Optional[str] = None
    power_music_covers: Optional[str] = None
    routine_notes: Optional[str] = None
    custom_voiceovers: Optional[str] = None
    voiceover_script: Optional[str] = None
    pronunciation_guidance: Optional[str] = None
    style: Optional[str] = None
    licensing_required: Optional[str] = None
    instrumentation_notes: Optional[str] = None
    lyrical_notes: Optional[str] = None
    is_rush_order: Optional[str] = None
    nicknames: Optional[str] = None
    vocals_preference: Optional[str] = None
    instrumental_style_preference: Optional[str] = None

    gym_name: Optional[str] = None
    gym_billing_address: Optional[str] = None
    team_name: Optional[str] = None
    team_coed_all_girl: Optional[str] = None
    team_colors: Optional[str] = None
    school_name: Optional[str] = None
    school_billing_address: Optional[str] = None
    mascot: Optional[str] = None
    split_or_no_split: Optional[str] = None
    viroc_choreographer_name: Optional[str] = None
    viroc_choreographer_email: Optional[str] = None
    colors: Optional[str] = None
    billing_address: Optional[str] = None
    coach_contact_full_name: Optional[str] = None
    coach_email_address: Optional[str] = None
    email_address: Optional[str] = None
    sending_eight_count_sheets: Optional[str] = None
    using_eight_count_sheets: Optional[str] = None
    song_list_suggestions: Optional[str] = None
    coupon_code: Optional[str] = None
    how_did_you_find_out: Optional[str] = None
    assigned_producer: Optional[str] = None
    assigned_producer_id: Optional[UUID] = None
    mix_start_date: Optional[str] = None
    mix_end_date: Optional[str] = None
    eight_count_sheet: Optional[str] = None
    have_songs: Optional[str] = None


class OrderUpdateSchema(BaseModel):
    customer_name: Optional[str] = None
    contact_name: Optional[str] = None
    program_name: Optional[str] = None
    category: Optional[str] = None
    package: Optional[str] = None
    package_type: Optional[str] = None
    time_length_of_mix: Optional[str] = None
    price: Optional[float] = None
    final_customer_price: Optional[float] = None
    final_customer_price_overridden: Optional[bool] = None
    price_compliance: Optional[str] = None
    music_theme: Optional[str] = None
    music_affiliate: Optional[str] = None
    affiliate_flag_status: Optional[str] = None
    music_affiliate_selections: Optional[str] = None
    power_music_covers: Optional[str] = None
    routine_notes: Optional[str] = None
    custom_voiceovers: Optional[str] = None
    song_list_suggestions: Optional[str] = None
    school_gym_name: Optional[str] = None
    school_gym_billing_address: Optional[str] = None
    school_program_name: Optional[str] = None
    school_address: Optional[str] = None
    city: Optional[str] = None
    state_province: Optional[str] = None
    zip_postal_code: Optional[str] = None
    country: Optional[str] = None
    division: Optional[str] = None
    coach_name: Optional[str] = None
    coach_phone: Optional[str] = None
    coach_email: Optional[str] = None
    billing_person_name: Optional[str] = None
    billing_person_email: Optional[str] = None
    choreographer_name: Optional[str] = None
    choreographer_email: Optional[str] = None
    number_of_copies: Optional[str] = None
    coupon_code: Optional[str] = None
    form_type: Optional[str] = None
    cheer_form_subtype: Optional[str] = None
    dance_form_subtype: Optional[str] = None
    requested_editor: Optional[str] = None
    split_or_no_split: Optional[str] = None
    editor_request: Optional[str] = None
    requested_producer: Optional[str] = None
    varsity_viroc_customer: Optional[str] = None
    status: Optional[str] = None
    needs_attention: Optional[bool] = None
    attention_reason: Optional[str] = None
    completed_at: Optional[datetime] = None
    is_past_order: Optional[bool] = None
    is_reassigned: Optional[bool] = None
    is_manual_entry: Optional[bool] = None
    merged_form_order_id: Optional[str] = None
    merged_into_manual_order_id: Optional[str] = None
    manual_overlap_snapshot: Optional[Any] = None
    suppress_manual_form_merge: Optional[bool] = None
    missing_data_email_sent_at: Optional[datetime] = None
    producer_email_sent_at: Optional[datetime] = None
    producer_email_sent_to: Optional[str] = None
    collection_states: Optional[Any] = None
    order_status: Optional[str] = None
    assigned_producer: Optional[str] = None
    assigned_producer_id: Optional[UUID] = None
    mix_start_date: Optional[str] = None
    mix_end_date: Optional[str] = None
    eight_count_sheet: Optional[str] = None
    have_songs: Optional[str] = None
    voiceover_script: Optional[str] = None
    pronunciation_guidance: Optional[str] = None
    style: Optional[str] = None
    licensing_required: Optional[str] = None
    instrumentation_notes: Optional[str] = None
    lyrical_notes: Optional[str] = None
    is_rush_order: Optional[str] = None
    nicknames: Optional[str] = None
    vocals_preference: Optional[str] = None
    instrumental_style_preference: Optional[str] = None
    gym_name: Optional[str] = None
    gym_billing_address: Optional[str] = None
    team_name: Optional[str] = None
    team_coed_all_girl: Optional[str] = None
    team_colors: Optional[str] = None
    school_name: Optional[str] = None
    school_billing_address: Optional[str] = None
    mascot: Optional[str] = None
    colors: Optional[str] = None
    billing_address: Optional[str] = None
    coach_contact_full_name: Optional[str] = None
    coach_email_address: Optional[str] = None
    email_address: Optional[str] = None
    sending_eight_count_sheets: Optional[str] = None
    using_eight_count_sheets: Optional[str] = None
    how_did_you_find_out: Optional[str] = None
