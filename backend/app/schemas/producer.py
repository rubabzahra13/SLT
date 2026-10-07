from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional, List, Dict, Any, Union
from uuid import UUID

class ProducerTimeOffSchema(BaseModel):
    id: UUID
    start_date: str
    end_date: str
    type: str
    reason: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator("start_date", "end_date", mode="before")
    @classmethod
    def stringify_dates(cls, value: Any) -> str:
        if hasattr(value, "isoformat"):
            return value.isoformat()
        return str(value)


class ProducerTimeOffWriteSchema(BaseModel):
    id: Optional[str] = None
    start_date: str
    end_date: str
    type: str = "holiday"
    reason: Optional[str] = None


class ProducerSchema(BaseModel):
    id: UUID
    name: str
    initials: str
    email: str
    categories: Optional[List[str]] = None
    avatar: Optional[str] = None
    mixes_this_week: int = 0
    work_days: List[str] = ["mon", "tue", "wed", "thu", "fri"]
    time_offs: List[ProducerTimeOffSchema] = []
    max_mixes_per_day: Optional[int] = None
    max_producer_cost_per_day: Optional[int] = None
    extra_days: List[str] = []

    compensation_model: Optional[str] = None
    default_rate: Optional[float] = None
    rates_by_category: Optional[Dict[str, float]] = None
    dance_voiceover_rate: Optional[float] = None
    cheer_voiceover_rate: Optional[float] = None
    rush_fee_rate: Optional[float] = None
    rate_overrides: Optional[Dict[str, float]] = None
    manual_input_fields: Optional[List[Dict[str, Any]]] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ProducerCreateSchema(BaseModel):
    name: str
    initials: str
    email: str
    categories: Optional[List[str]] = None
    avatar: Optional[str] = None
    work_days: Optional[List[str]] = ["mon", "tue", "wed", "thu", "fri"]
    max_mixes_per_day: Optional[int] = None
    max_producer_cost_per_day: Optional[int] = None
    extra_days: Optional[List[str]] = []
    time_offs: Optional[List[ProducerTimeOffWriteSchema]] = None

    compensation_model: Optional[str] = None
    default_rate: Optional[float] = None
    rates_by_category: Optional[Dict[str, float]] = None
    dance_voiceover_rate: Optional[float] = None
    cheer_voiceover_rate: Optional[float] = None
    rush_fee_rate: Optional[float] = None
    rate_overrides: Optional[Dict[str, float]] = None
    manual_input_fields: Optional[List[Dict[str, Any]]] = None
    notes: Optional[str] = None

class ProducerUpdateSchema(BaseModel):
    name: Optional[str] = None
    initials: Optional[str] = None
    email: Optional[str] = None
    categories: Optional[List[str]] = None
    avatar: Optional[str] = None
    mixes_this_week: Optional[int] = None
    work_days: Optional[List[str]] = None
    max_mixes_per_day: Optional[int] = None
    max_producer_cost_per_day: Optional[int] = None
    extra_days: Optional[List[str]] = None
    time_offs: Optional[List[ProducerTimeOffWriteSchema]] = None

    compensation_model: Optional[str] = None
    default_rate: Optional[float] = None
    rates_by_category: Optional[Dict[str, float]] = None
    dance_voiceover_rate: Optional[float] = None
    cheer_voiceover_rate: Optional[float] = None
    rush_fee_rate: Optional[float] = None
    rate_overrides: Optional[Dict[str, float]] = None
    manual_input_fields: Optional[List[Dict[str, Any]]] = None
    notes: Optional[str] = None
    # Client's last-seen updated_at; when set and server is newer → 409.
    if_match_updated_at: Optional[datetime] = None
