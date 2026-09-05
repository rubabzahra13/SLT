import uuid
from sqlalchemy import Column, String, Boolean, Text, Numeric, Date, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class MTDRecord(Base):
    __tablename__ = "mtd_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    legacy_id = Column(String, nullable=True, index=True)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="SET NULL"), nullable=True, index=True)
    section = Column(String, nullable=False, default="CHEERLEADING MUSIC")
    assigned_producer_id = Column(UUID(as_uuid=True), ForeignKey("producers.id", ondelete="SET NULL"), nullable=True, index=True)

    category = Column(String, nullable=False)
    editor_request = Column(String, nullable=True)
    contact_name = Column(String, nullable=False)
    editor_initials = Column(String, nullable=True)
    program_name = Column(String, nullable=False)
    package = Column(String, nullable=False)
    music_theme = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=False, default=0.0)
    price_compliance = Column(String, default="compliant", nullable=False)
    invoice = Column(String, default="", nullable=False)
    mix_start_date = Column(Date, nullable=True)
    mix_end_date = Column(Date, nullable=True)
    waiting_on = Column(String, nullable=True)
    eight_count_sheet = Column(String, default="", nullable=False)
    have_songs = Column(String, default="", nullable=False)
    needs_attention = Column(Boolean, default=False, nullable=False)
    status = Column(String, default="active", nullable=False)
    record_status = Column(String, nullable=True)
    in_payroll = Column(Boolean, default=False, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    order = relationship("Order", back_populates="mtd_record")
    assigned_producer = relationship("Producer", back_populates="mtd_records")
