from pydantic import BaseModel, ConfigDict, field_validator, model_validator
from typing import Optional, Any
from uuid import UUID
from datetime import date, datetime


class MTDRecordSchema(BaseModel):
    """Board row. Identity, assignment, and collection are projected from Order."""

    id: UUID
    order_id: Optional[UUID] = None
    section: str
    # --- Order-SoT assignment (Phase 4) ---
    assigned_producer_id: Optional[UUID] = None
    assigned_producer: Optional[str] = None
    editor_initials: Optional[str] = None
    mix_start_date: Optional[date] = None
    mix_end_date: Optional[date] = None
    is_reassigned: bool = False
    # --- Order-SoT identity (Phase 3) ---
    category: str = "Cheer"
    editor_request: Optional[str] = None
    contact_name: str = ""
    program_name: str = ""
    package: str = ""
    music_theme: Optional[str] = None
    # --- Order-SoT collection / ops (Phase 5) ---
    received_eight_count_sheet: str = ""
    have_songs: str = ""
    collection_states: Optional[Any] = None
    order_status: Optional[str] = None
    needs_attention: bool = False
    missing_data_email_sent_at: Optional[datetime] = None
    producer_email_sent_at: Optional[datetime] = None
    producer_email_sent_to: Optional[str] = None
    # --- MTD-stored (board / payroll) ---
    price: float
    price_compliance: str
    invoice: str = ""
    waiting_on: Optional[str] = None
    status: str = "active"
    record_status: Optional[str] = None
    in_mtd: bool = False
    in_payroll: bool = False
    is_manual_schedule_entry: bool = False
    completed_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    has_extend_8ct_addon: bool = False
    has_processing_8ct_sheets_addon: bool = False
    extra_songs_quantity: int = 0
    extra_song_editing_time_quantity: int = 0
    final_customer_price: Optional[float] = None
    final_customer_price_overridden: bool = False

    model_config = ConfigDict(from_attributes=True)

    @field_validator("assigned_producer", mode="before")
    @classmethod
    def format_producer(cls, v):
        if hasattr(v, "initials"):
            return v.initials
        if isinstance(v, str):
            return v
        return None

    @model_validator(mode="after")
    def fallback_assigned_from_editor_initials(self) -> "MTDRecordSchema":
        if self.assigned_producer:
            return self
        initials = (self.editor_initials or "").strip().upper()
        if initials and initials != "NA":
            self.assigned_producer = initials
        return self


class MTDRecordCreateSchema(BaseModel):
    """Create board row. Order-SoT fields optional for FE compat; applied to Order."""

    order_id: Optional[Any] = None
    section: Optional[str] = "CHEERLEADING MUSIC"
    category: Optional[str] = None
    contact_name: Optional[str] = None
    program_name: Optional[str] = None
    package: Optional[str] = None
    music_theme: Optional[str] = None
    editor_request: Optional[str] = None
    assigned_producer: Optional[str] = None
    mix_start_date: Optional[date] = None
    mix_end_date: Optional[date] = None
    is_reassigned: Optional[bool] = False
    price: Optional[float] = 0.0
    invoice: Optional[str] = ""
    received_eight_count_sheet: Optional[str] = "NEED CS"
    have_songs: Optional[str] = "NEED SONGS"
    collection_states: Optional[Any] = None
    order_status: Optional[str] = None
    needs_attention: Optional[bool] = True
    status: Optional[str] = "needs_attention"
    record_status: Optional[str] = None
    in_mtd: Optional[bool] = False
    has_extend_8ct_addon: Optional[bool] = False
    has_processing_8ct_sheets_addon: Optional[bool] = False
    extra_songs_quantity: Optional[int] = 0
    extra_song_editing_time_quantity: Optional[int] = 0
    missing_data_email_sent_at: Optional[datetime] = None
    producer_email_sent_at: Optional[datetime] = None
    producer_email_sent_to: Optional[str] = None


class MTDRecordUpdateSchema(BaseModel):
    section: Optional[str] = None
    assigned_producer: Optional[str] = None
    # Compat: Order-SoT patches are redirected to Orders in the API.
    category: Optional[str] = None
    editor_request: Optional[str] = None
    contact_name: Optional[str] = None
    editor_initials: Optional[str] = None
    program_name: Optional[str] = None
    package: Optional[str] = None
    music_theme: Optional[str] = None
    price: Optional[float] = None
    price_compliance: Optional[str] = None
    invoice: Optional[str] = None
    mix_start_date: Optional[date] = None
    mix_end_date: Optional[date] = None
    waiting_on: Optional[str] = None
    received_eight_count_sheet: Optional[str] = None
    have_songs: Optional[str] = None
    collection_states: Optional[Any] = None
    order_status: Optional[str] = None
    needs_attention: Optional[bool] = None
    status: Optional[str] = None
    record_status: Optional[str] = None
    in_mtd: Optional[bool] = None
    is_reassigned: Optional[bool] = None
    missing_data_email_sent_at: Optional[datetime] = None
    producer_email_sent_at: Optional[datetime] = None
    producer_email_sent_to: Optional[str] = None
    in_payroll: Optional[bool] = None
    completed_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    has_extend_8ct_addon: Optional[bool] = None
    has_processing_8ct_sheets_addon: Optional[bool] = None
    extra_songs_quantity: Optional[int] = None
    extra_song_editing_time_quantity: Optional[int] = None
    final_customer_price: Optional[float] = None
    final_customer_price_overridden: Optional[bool] = None
    is_manual_schedule_entry: Optional[bool] = None


class ManualScheduleCreateSchema(BaseModel):
    category: str
    form_type: Optional[str] = "school-all-star-cheer"
    cheer_form_subtype: Optional[str] = None
    dance_form_subtype: Optional[str] = None
    mix_start_date: Optional[str] = None
    mix_end_date: Optional[str] = None
    assigned_producer: Optional[str] = None
    program_name: Optional[str] = None
    school_program_name: Optional[str] = None
    gym_name: Optional[str] = None
    school_name: Optional[str] = None
    team_name: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[str] = None
    coach_email: Optional[str] = None
    package: Optional[str] = None
    routine_notes: Optional[str] = None
    music_affiliate: Optional[str] = None
    time_length_of_mix: Optional[str] = None
    song_list_suggestions: Optional[str] = None
    custom_voiceovers: Optional[str] = None
    received_eight_count_sheet: Optional[str] = None
    video_url: Optional[str] = None
    has_extend_8ct_addon: Optional[bool] = False
    has_processing_8ct_sheets_addon: Optional[bool] = False
    has_traditional_voiceover: Optional[bool] = False
    has_themed_voiceover: Optional[bool] = False
    dance_voiceover: Optional[str] = None
