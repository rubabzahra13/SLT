from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional, Any
from uuid import UUID
from datetime import date, datetime
import json

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
    collection_states: Optional[Any] = None
    order_status: Optional[str] = None
    needs_attention: bool = False
    status: str = "active"
    record_status: Optional[str] = None
    in_mtd: bool = False
    is_reassigned: bool = False
    missing_data_email_sent_at: Optional[datetime] = None
    in_payroll: bool = False
    completed_at: Optional[datetime] = None
    has_rally_mix: bool = False
    has_extend_8ct_addon: bool = False
    has_processing_8ct_sheets_addon: bool = False

    # Pricing / payroll fields
    system_calculated_customer_price: Optional[float] = None
    final_customer_price: Optional[float] = None
    final_customer_price_overridden: bool = False
    pricing_breakdown: Optional[Any] = None
    rate_used: Optional[float] = None
    rate_source: Optional[str] = None
    producer_payout: Optional[float] = None
    slt_portion: Optional[float] = None
    payroll_finalized: bool = False
    payroll_breakdown: Optional[Any] = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator("pricing_breakdown", "payroll_breakdown", mode="before")
    @classmethod
    def parse_json_field(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return v
        return v

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
    record_status: Optional[str] = None
    mix_start_date: Optional[date] = None
    mix_end_date: Optional[date] = None
    in_mtd: Optional[bool] = False
    is_reassigned: Optional[bool] = False
    has_rally_mix: Optional[bool] = False
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
    eight_count_sheet: Optional[str] = None
    have_songs: Optional[str] = None
    collection_states: Optional[Any] = None
    order_status: Optional[str] = None
    needs_attention: Optional[bool] = None
    status: Optional[str] = None
    record_status: Optional[str] = None
    in_mtd: Optional[bool] = None
    is_reassigned: Optional[bool] = None
    missing_data_email_sent_at: Optional[datetime] = None
    in_payroll: Optional[bool] = None
    completed_at: Optional[datetime] = None
    has_rally_mix: Optional[bool] = None
    has_extend_8ct_addon: Optional[bool] = None
    has_processing_8ct_sheets_addon: Optional[bool] = None
    system_calculated_customer_price: Optional[float] = None
    final_customer_price: Optional[float] = None
    final_customer_price_overridden: Optional[bool] = None
    pricing_breakdown: Optional[Any] = None
    rate_used: Optional[float] = None
    rate_source: Optional[str] = None
    producer_payout: Optional[float] = None
    slt_portion: Optional[float] = None
    payroll_finalized: Optional[bool] = None
    payroll_breakdown: Optional[Any] = None
