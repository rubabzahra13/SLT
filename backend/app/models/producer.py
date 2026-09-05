import uuid
from sqlalchemy import Column, String, Integer, JSON, DateTime, ForeignKey, func, Date, Text, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class Producer(Base):
    __tablename__ = "producers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    legacy_id = Column(String, nullable=True, index=True)
    name = Column(String, nullable=False)
    initials = Column(String, nullable=False, unique=True, index=True)
    email = Column(String, nullable=False)
    specialty = Column(String, nullable=False)
    avatar = Column(String, nullable=True)
    mixes_this_week = Column(Integer, default=0, nullable=False)
    next_available = Column(String, nullable=True)
    status = Column(String, default="available", nullable=False)
    work_days = Column(JSON, default=lambda: ["mon", "tue", "wed", "thu", "fri"], nullable=False)
    max_mixes_per_day = Column(Integer, nullable=True)
    overtime_days = Column(JSON, default=list, nullable=False)

    compensation_model = Column(String, nullable=True)
    default_rate = Column(Numeric(5, 4), nullable=True)
    rates_by_category = Column(JSON, nullable=True)
    rate_overrides = Column(JSON, nullable=True)
    manual_input_fields = Column(JSON, nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    time_offs = relationship("ProducerTimeOff", back_populates="producer", cascade="all, delete-orphan")
    mtd_records = relationship("MTDRecord", back_populates="assigned_producer")
    schedule_entries = relationship("ScheduleEntry", back_populates="producer", cascade="all, delete-orphan")


class ProducerTimeOff(Base):
    __tablename__ = "producer_time_off"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    producer_id = Column(UUID(as_uuid=True), ForeignKey("producers.id", ondelete="CASCADE"), nullable=False, index=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    type = Column(String, default="holiday", nullable=False)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    producer = relationship("Producer", back_populates="time_offs")
