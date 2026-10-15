from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PricingRuleSchema(BaseModel):
    id: UUID
    form_type: str
    subtype_id: Optional[str] = None
    package_id: str
    package_name: str
    customer_facing_price: Optional[float] = None
    payroll_base_compliant: Optional[float] = None
    payroll_base_non_compliant: Optional[float] = None
    compliance_sensitive: bool = False
    note: Optional[str] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PricingRulePackageUpdate(BaseModel):
    package_id: Optional[str] = None
    package_name: str
    customer_facing_price: Optional[float] = None
    payroll_base_compliant: Optional[float] = None
    payroll_base_non_compliant: Optional[float] = None
    note: Optional[str] = None


class PricingRulesReplaceSchema(BaseModel):
    """Upsert package prices for one form type (and optional subtype)."""

    form_type: str = Field(
        ...,
        pattern=(
            "^(marching-band|sports-entertainment|school-anthem|"
            "school-all-star-dance|school-all-star-cheer)$"
        ),
    )
    subtype_id: Optional[str] = None
    packages: List[PricingRulePackageUpdate]
