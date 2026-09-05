import uuid
from sqlalchemy import Column, String, Numeric, JSON, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class SecretMenuPricing(Base):
    __tablename__ = "secret_menu_pricing"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    package_name = Column(String, nullable=False)
    menu_title = Column(String, nullable=False)
    base_price = Column(Numeric(10, 2), nullable=False)
    extra_song_tiers = Column(JSON, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
