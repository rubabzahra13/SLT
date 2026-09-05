import uuid
from sqlalchemy import Column, String, Integer, Date, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class ScheduleEntry(Base):
    __tablename__ = "schedule_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    producer_id = Column(UUID(as_uuid=True), ForeignKey("producers.id", ondelete="CASCADE"), nullable=True, index=True)
    producer_initials = Column(String, nullable=False, index=True)
    day = Column(String, nullable=False, index=True) # E.g., 'Mon' or YYYY-MM-DD
    status = Column(String, default="available", nullable=False) # 'mix', 'available', 'off'
    count = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    producer = relationship("Producer", back_populates="schedule_entries")
