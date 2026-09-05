import uuid
from sqlalchemy import Column, String, Numeric, Boolean, Text, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class PricingRule(Base):
    __tablename__ = "pricing_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Classification keys
    form_type = Column(String, nullable=False, index=True)
    # Null for marching-band, sports-entertainment, school-anthem (no subtype)
    subtype_id = Column(String, nullable=True, index=True)
    package_id = Column(String, nullable=False, index=True)
    package_name = Column(String, nullable=False)

    # Prices — null means "TBD via email" (e.g. Sports Entertainment OTHER)
    customer_facing_price = Column(Numeric(10, 2), nullable=True)
    payroll_base_compliant = Column(Numeric(10, 2), nullable=True)
    payroll_base_non_compliant = Column(Numeric(10, 2), nullable=True)
    compliance_sensitive = Column(Boolean, nullable=False, default=True)

    note = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
