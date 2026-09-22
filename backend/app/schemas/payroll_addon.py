from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class PayrollAddonOut(BaseModel):
    id: UUID
    program_name: str
    contact_name: Optional[str] = None
    category: str
    addon_type: str
    amount: float
    rate_source: str
    producer_id: Optional[UUID] = None
    producer_initials: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PayrollAddonCreate(BaseModel):
    program_name: str = Field(..., min_length=1)
    contact_name: Optional[str] = None
    category: str = Field(..., pattern="^(Cheer|Dance)$")
    addon_type: str = Field(..., pattern="^(voiceover|rush_fee)$")
    amount: float = Field(..., gt=0)
    rate_source: str = Field(..., pattern="^(predefined|manual)$")
    producer_id: Optional[UUID] = None
    producer_initials: Optional[str] = None
    notes: Optional[str] = None
