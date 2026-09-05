from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID

class DiscountCodeSchema(BaseModel):
    id: UUID
    legacy_id: Optional[str] = None
    code: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class DiscountCodeCreateSchema(BaseModel):
    code: str
    description: Optional[str] = ""

class DiscountCodeUpdateSchema(BaseModel):
    code: Optional[str] = None
    description: Optional[str] = None
