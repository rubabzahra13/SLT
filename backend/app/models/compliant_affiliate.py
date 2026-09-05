import uuid
from sqlalchemy import Column, String, JSON, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class CompliantAffiliate(Base):
    __tablename__ = "compliant_affiliates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # The canonical name used in pricing_rules.json e.g. "Power Music"
    name = Column(String, nullable=False, unique=True, index=True)

    # Alternative spellings/values that map to this canonical name
    # e.g. ["Power Music Covers", "PowerMusic"]
    synonyms = Column(JSON, nullable=False, default=list)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
