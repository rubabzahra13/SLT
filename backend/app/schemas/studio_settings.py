from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from uuid import UUID


class StudioHolidaySchema(BaseModel):
    id: UUID
    legacy_id: Optional[str] = None
    name: str
    start_date: str
    end_date: str
    applies_to_all: bool = True
    producer_ids: List[str] = Field(default_factory=list)
    sort_order: int = 0

    model_config = ConfigDict(from_attributes=True)


class StudioHolidayCreateSchema(BaseModel):
    legacy_id: Optional[str] = None
    name: str
    start_date: str
    end_date: str
    applies_to_all: bool = True
    producer_ids: Optional[List[str]] = None
    sort_order: Optional[int] = 0


class StudioHolidayUpdateSchema(BaseModel):
    name: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    applies_to_all: Optional[bool] = None
    producer_ids: Optional[List[str]] = None
    sort_order: Optional[int] = None


class StudioPersonalReasonSchema(BaseModel):
    id: UUID
    legacy_id: Optional[str] = None
    name: str
    enabled: bool = True
    is_other: bool = False
    sort_order: int = 0

    model_config = ConfigDict(from_attributes=True)


class StudioPersonalReasonCreateSchema(BaseModel):
    legacy_id: Optional[str] = None
    name: str
    enabled: bool = True
    is_other: bool = False
    sort_order: Optional[int] = 0


class StudioPersonalReasonUpdateSchema(BaseModel):
    name: Optional[str] = None
    enabled: Optional[bool] = None
    is_other: Optional[bool] = None
    sort_order: Optional[int] = None


class EmailTemplateSchema(BaseModel):
    id: str
    subject: str = ""
    greeting: str = ""
    intro: str = ""
    footer: str = ""
    signature: str = ""

    model_config = ConfigDict(from_attributes=True)


class EmailTemplateUpdateSchema(BaseModel):
    subject: Optional[str] = None
    greeting: Optional[str] = None
    intro: Optional[str] = None
    footer: Optional[str] = None
    signature: Optional[str] = None
