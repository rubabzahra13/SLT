import uuid
from sqlalchemy import Column, String, Text, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class DiscountCode(Base):
    __tablename__ = "discount_codes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    legacy_id = Column(String, nullable=True, index=True)
    code = Column(String, nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
