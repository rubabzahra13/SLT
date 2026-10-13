from datetime import datetime
from typing import Optional, Union
from uuid import UUID
from pydantic import BaseModel, Field


class PayrollAddonOut(BaseModel):
    id: UUID
    program_name: str
    contact_name: Optional[str] = None
    team_name: Optional[str] = None
    order_id: Optional[Union[UUID, str]] = None
    mtd_id: Optional[Union[UUID, str]] = None
    category: str
    addon_type: str
    amount: float
    quantity: Optional[int] = None
    unit_amount: Optional[float] = None
    compensation_rate: Optional[float] = None
    compensation_overridden: bool = False
    rate_source: str
    producer_id: Optional[Union[UUID, str]] = None
    producer_initials: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PayrollAddonCreate(BaseModel):
    program_name: str = Field(..., min_length=1)
    contact_name: Optional[str] = None
    team_name: Optional[str] = None
    order_id: Optional[Union[UUID, str]] = None
    mtd_id: Optional[Union[UUID, str]] = None
    category: str = Field(..., pattern="^(Cheer|Dance)$")
    addon_type: str = Field(..., pattern="^(voiceover|rush_fee)$")
    amount: float = Field(..., gt=0)
    quantity: Optional[int] = Field(None, ge=0, le=100)
    unit_amount: Optional[float] = Field(None, gt=0)
    compensation_rate: Optional[float] = None
    compensation_overridden: bool = False
    rate_source: str = Field(..., pattern="^(predefined|manual)$")
    producer_id: Optional[Union[UUID, str]] = None
    producer_initials: Optional[str] = None
    notes: Optional[str] = None


class PayrollAddonUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    quantity: Optional[int] = Field(None, ge=0, le=100)
    unit_amount: Optional[float] = Field(None, gt=0)
    compensation_rate: Optional[float] = None
    compensation_overridden: Optional[bool] = None
    producer_id: Optional[Union[UUID, str]] = None
    producer_initials: Optional[str] = None
    notes: Optional[str] = None


