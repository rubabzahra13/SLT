from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from uuid import UUID


class DiscountCodeSchema(BaseModel):
    id: UUID
    code: str

    model_config = ConfigDict(from_attributes=True)


class DiscountCodeCreateSchema(BaseModel):
    code: str = Field(..., min_length=1)


class DiscountCodeUpdateSchema(BaseModel):
    code: Optional[str] = None
