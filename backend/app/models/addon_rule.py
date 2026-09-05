import uuid
from sqlalchemy import Column, String, Numeric, Text, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class AddonRule(Base):
    __tablename__ = "addon_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    addon_id = Column(String, nullable=False, unique=True, index=True)
    label = Column(String, nullable=False)

    # For fixed-price addons (e.g. rush fee $150). Null for quantity-based.
    amount = Column(Numeric(10, 2), nullable=True)
    # For quantity-based addons (extra_song $15/ea). Null for fixed.
    unit_amount = Column(Numeric(10, 2), nullable=True)

    # "dropdown_single_select" | "quantity"
    input_type = Column(String, nullable=False)

    # "global" | "cheer" | "dance" | "youth_rec_cheer" etc.
    scope = Column(String, nullable=False, default="global")

    note = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
