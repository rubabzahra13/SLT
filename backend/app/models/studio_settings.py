import uuid
from sqlalchemy import Column, String, Boolean, JSON, DateTime, Text, Integer, func
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base


class StudioHoliday(Base):
    __tablename__ = "studio_holidays"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    legacy_id = Column(String, nullable=True, index=True)
    name = Column(String, nullable=False)
    # Annual MM-DD (year applied when expanding for calendars)
    start_date = Column(String, nullable=False)
    end_date = Column(String, nullable=False)
    applies_to_all = Column(Boolean, default=True, nullable=False)
    # Producer ids (legacy/uuid strings) when applies_to_all is false
    producer_ids = Column(JSON, default=list, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class StudioPersonalReason(Base):
    __tablename__ = "studio_personal_reasons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    legacy_id = Column(String, nullable=True, index=True)
    name = Column(String, nullable=False)
    enabled = Column(Boolean, default=True, nullable=False)
    is_other = Column(Boolean, default=False, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class EmailTemplate(Base):
    __tablename__ = "email_templates"

    # Stable template key, e.g. customer_missing_data
    id = Column(String, primary_key=True)
    subject = Column(Text, nullable=False, default="")
    greeting = Column(Text, nullable=False, default="")
    intro = Column(Text, nullable=False, default="")
    footer = Column(Text, nullable=False, default="")
    signature = Column(Text, nullable=False, default="")

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
