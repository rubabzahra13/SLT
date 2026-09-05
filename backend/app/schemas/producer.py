from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from uuid import UUID

class ProducerTimeOffSchema(BaseModel):
    id: UUID
    start_date: str
    end_date: str
    type: str
    reason: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ProducerSchema(BaseModel):
    id: UUID
    legacy_id: Optional[str] = None
    name: str
    initials: str
    email: str
    specialty: str
    avatar: Optional[str] = None
    mixes_this_week: int = 0
    next_available: Optional[str] = None
    status: str = "available"
    work_days: List[str] = ["mon", "tue", "wed", "thu", "fri"]
    time_offs: List[ProducerTimeOffSchema] = []
    max_mixes_per_day: Optional[int] = None
    overtime_days: List[str] = []

    compensation_model: Optional[str] = None
    default_rate: Optional[float] = None
    rates_by_category: Optional[Dict[str, float]] = None
    rate_overrides: Optional[Dict[str, float]] = None
    manual_input_fields: Optional[List[Dict[str, Any]]] = None
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ProducerCreateSchema(BaseModel):
    name: str
    initials: str
    email: str
    specialty: str
    avatar: Optional[str] = None
    status: Optional[str] = "available"
    work_days: Optional[List[str]] = ["mon", "tue", "wed", "thu", "fri"]
    max_mixes_per_day: Optional[int] = None
    overtime_days: Optional[List[str]] = []

    compensation_model: Optional[str] = None
    default_rate: Optional[float] = None
    rates_by_category: Optional[Dict[str, float]] = None
    rate_overrides: Optional[Dict[str, float]] = None
    manual_input_fields: Optional[List[Dict[str, Any]]] = None
    notes: Optional[str] = None

class ProducerUpdateSchema(BaseModel):
    name: Optional[str] = None
    initials: Optional[str] = None
    email: Optional[str] = None
    specialty: Optional[str] = None
    avatar: Optional[str] = None
    mixes_this_week: Optional[int] = None
    next_available: Optional[str] = None
    status: Optional[str] = None
    work_days: Optional[List[str]] = None
    max_mixes_per_day: Optional[int] = None
    overtime_days: Optional[List[str]] = None

    compensation_model: Optional[str] = None
    default_rate: Optional[float] = None
    rates_by_category: Optional[Dict[str, float]] = None
    rate_overrides: Optional[Dict[str, float]] = None
    manual_input_fields: Optional[List[Dict[str, Any]]] = None
    notes: Optional[str] = None
