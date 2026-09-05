import uuid
from sqlalchemy import Column, String, Numeric, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class PackagePrice(Base):
    __tablename__ = "package_prices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    package_key = Column(String, nullable=False, unique=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
