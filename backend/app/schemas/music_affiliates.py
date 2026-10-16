from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class MusicAffiliateOptionSchema(BaseModel):
    id: UUID
    form_type: str
    subtype_id: Optional[str] = None
    option_key: str
    label: str
    is_compliant: bool
    enabled: bool
    sort_order: int
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class MusicAffiliateOptionUpdate(BaseModel):
    option_key: str = Field(..., min_length=1, max_length=120)
    label: str = Field(..., min_length=1, max_length=500)
    is_compliant: bool = True
    enabled: bool = True
    sort_order: int = 0


class MusicAffiliatesReplaceSchema(BaseModel):
    """Replace the SoftSelect/compliance catalog for one form type (+ subtype)."""

    form_type: str = Field(
        ...,
        pattern=(
            "^(marching-band|sports-entertainment|school-anthem|"
            "school-all-star-dance|school-all-star-cheer)$"
        ),
    )
    subtype_id: Optional[str] = None
    options: List[MusicAffiliateOptionUpdate]
