from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime

class OrderSchema(BaseModel):
    id: UUID
    legacy_id: Optional[str] = None
    form_type: Optional[str] = "school-all-star-cheer"
    cheer_form_subtype: Optional[str] = None
    dance_form_subtype: Optional[str] = None

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
    power_music_covers: Optional[str] = None
    routine_notes: Optional[str] = None
    custom_voiceovers: Optional[str] = None

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

    customer_name: str
    contact_name: str
    program_name: str
    category: str
    package: str
    music_theme: Optional[str] = None
    editor_request: Optional[str] = None
    requested_producer: Optional[str] = None
    price: float
    price_compliance: Optional[str] = None
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    needs_attention: bool = False
    attention_reason: Optional[str] = None
    is_past_order: bool = False

    model_config = ConfigDict(from_attributes=True)

class OrderCreateSchema(BaseModel):
    customer_name: str
    contact_name: str
    program_name: str
    category: str
    package: str
    price: float
    music_theme: Optional[str] = None
    editor_request: Optional[str] = "FA"
    requested_producer: Optional[str] = None
    form_type: Optional[str] = "school-all-star-cheer"
    status: Optional[str] = "new"

class OrderUpdateSchema(BaseModel):
    customer_name: Optional[str] = None
    contact_name: Optional[str] = None
    program_name: Optional[str] = None
    category: Optional[str] = None
    package: Optional[str] = None
    price: Optional[float] = None
    music_theme: Optional[str] = None
    editor_request: Optional[str] = None
    requested_producer: Optional[str] = None
    status: Optional[str] = None
    needs_attention: Optional[bool] = None
    attention_reason: Optional[str] = None
    completed_at: Optional[datetime] = None
    is_past_order: Optional[bool] = None
