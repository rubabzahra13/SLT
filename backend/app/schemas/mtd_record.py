from pydantic import BaseModel, ConfigDict, field_validator, model_validator
from typing import Optional, Any
from uuid import UUID
from datetime import date, datetime

class MTDRecordSchema(BaseModel):
    id: UUID
    order_id: Optional[UUID] = None
    section: str
    assigned_producer_id: Optional[UUID] = None
    assigned_producer: Optional[str] = None
    category: str
    editor_request: Optional[str] = None
    contact_name: str
    editor_initials: Optional[str] = None
    program_name: str
    package: str
    music_theme: Optional[str] = None
    price: float
    price_compliance: str
    invoice: str = ""
    mix_start_date: Optional[date] = None
    mix_end_date: Optional[date] = None
    waiting_on: Optional[str] = None
    received_eight_count_sheet: str = ""
    have_songs: str = ""
    collection_states: Optional[Any] = None
    order_status: Optional[str] = None
    needs_attention: bool = False
    status: str = "active"
    record_status: Optional[str] = None
    in_mtd: bool = False
    is_reassigned: bool = False
    missing_data_email_sent_at: Optional[datetime] = None
    producer_email_sent_at: Optional[datetime] = None
    producer_email_sent_to: Optional[str] = None
    in_payroll: bool = False
    is_manual_schedule_entry: bool = False
    completed_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    has_extend_8ct_addon: bool = False
    has_processing_8ct_sheets_addon: bool = False

    # Board display cache only — payout/system/rate SoT is Orders.
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
        # When FK was cleared during an initials rename race, editor_initials
        # still holds the assignment key — expose it so Orders doesn't flash Assign.
        if self.assigned_producer:
            return self
        initials = (self.editor_initials or "").strip().upper()
        if initials and initials != "NA":
            self.assigned_producer = initials
        return self

class MTDRecordCreateSchema(BaseModel):
    # Accept order UUID; resolved in the API layer.
    order_id: Optional[Any] = None
    section: Optional[str] = "CHEERLEADING MUSIC"
    category: str
    contact_name: str
    program_name: str
    package: str
    price: float
    music_theme: Optional[str] = None
    editor_request: Optional[str] = "FA"
    assigned_producer: Optional[str] = None
    invoice: Optional[str] = ""
    received_eight_count_sheet: Optional[str] = "NEED CS"
    have_songs: Optional[str] = "NEED SONGS"
    collection_states: Optional[Any] = None
    order_status: Optional[str] = None
    needs_attention: Optional[bool] = True
    status: Optional[str] = "needs_attention"
    record_status: Optional[str] = None
    mix_start_date: Optional[date] = None
    mix_end_date: Optional[date] = None
    in_mtd: Optional[bool] = False
    is_reassigned: Optional[bool] = False
    has_extend_8ct_addon: Optional[bool] = False
    has_processing_8ct_sheets_addon: Optional[bool] = False

class MTDRecordUpdateSchema(BaseModel):
    section: Optional[str] = None
    assigned_producer: Optional[str] = None
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
    final_customer_price: Optional[float] = None
    final_customer_price_overridden: Optional[bool] = None
    is_manual_schedule_entry: Optional[bool] = None


class ManualScheduleCreateSchema(BaseModel):
    category: str
    form_type: Optional[str] = "school-all-star-cheer"
    # Only one family applies per form_type — never default the other to "pom".
    cheer_form_subtype: Optional[str] = None
    dance_form_subtype: Optional[str] = None
    # Scheduling is done from the Orders table after the row is created.
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
