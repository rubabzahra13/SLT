from datetime import datetime
from typing import Optional, Union
from uuid import UUID
from pydantic import BaseModel, Field, model_validator


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
    category: str = Field(..., min_length=1)
    addon_type: str = Field(..., pattern="^(voiceover|rush_fee|misc_adjustment)$")
    amount: float
    quantity: Optional[int] = Field(None, ge=0, le=100)
    unit_amount: Optional[float] = Field(None, gt=0)
    compensation_rate: Optional[float] = None
    compensation_overridden: bool = False
    rate_source: str = Field(..., pattern="^(predefined|manual)$")
    producer_id: Optional[Union[UUID, str]] = None
    producer_initials: Optional[str] = None
    notes: Optional[str] = None

    @model_validator(mode="after")
    def validate_amount_and_category(self):
        if self.addon_type == "misc_adjustment":
            if self.amount == 0:
                raise ValueError("Miscellaneous adjustment amount cannot be zero.")
            return self

        if self.amount <= 0:
            raise ValueError("Add-on amount must be greater than 0.")
        if self.category not in ("Cheer", "Dance"):
            raise ValueError("Category must be Cheer or Dance for voiceover/rush fee.")
        return self


class PayrollAddonUpdate(BaseModel):
    amount: Optional[float] = None
    quantity: Optional[int] = Field(None, ge=0, le=100)
    unit_amount: Optional[float] = Field(None, gt=0)
    compensation_rate: Optional[float] = None
    compensation_overridden: Optional[bool] = None
    producer_id: Optional[Union[UUID, str]] = None
    producer_initials: Optional[str] = None
    notes: Optional[str] = None

    @model_validator(mode="after")
    def validate_amount(self):
        if self.amount is not None and self.amount == 0:
            raise ValueError("Amount cannot be zero.")
        return self
