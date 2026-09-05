from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional
from uuid import UUID
from datetime import date, datetime

class MTDRecordSchema(BaseModel):
    id: UUID
    legacy_id: Optional[str] = None
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
    eight_count_sheet: str = ""
    have_songs: str = ""
    needs_attention: bool = False
    status: str = "active"
    record_status: Optional[str] = None
    in_payroll: bool = False
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator("assigned_producer", mode="before")
    @classmethod
    def format_producer(cls, v):
        if hasattr(v, "initials"):
            return v.initials
        if isinstance(v, str):
            return v
        return None

class MTDRecordCreateSchema(BaseModel):
    order_id: Optional[UUID] = None
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
    eight_count_sheet: Optional[str] = "NEED CS"
    have_songs: Optional[str] = "NEED SONGS"
    needs_attention: Optional[bool] = True
    status: Optional[str] = "needs_attention"

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
    eight_count_sheet: Optional[str] = None
    have_songs: Optional[str] = None
    needs_attention: Optional[bool] = None
    status: Optional[str] = None
    record_status: Optional[str] = None
    in_payroll: Optional[bool] = None
    completed_at: Optional[datetime] = None
