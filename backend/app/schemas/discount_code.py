from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID

class DiscountCodeSchema(BaseModel):
    id: UUID
    code: str
    description: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)

class DiscountCodeCreateSchema(BaseModel):
    code: str
    description: Optional[str] = ""
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None

class DiscountCodeUpdateSchema(BaseModel):
    code: Optional[str] = None
    description: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
