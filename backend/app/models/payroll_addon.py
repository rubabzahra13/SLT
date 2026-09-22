import uuid
from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, func, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class PayrollAddon(Base):
    __tablename__ = "payroll_addons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    program_name = Column(String, nullable=False)
    contact_name = Column(String, nullable=True)

    # "Cheer" or "Dance"
    category = Column(String, nullable=False)

    # "voiceover" or "rush_fee"
    addon_type = Column(String, nullable=False)

    # Dollar amount
    amount = Column(Numeric(10, 2), nullable=False)

    # "predefined" or "manual"
    rate_source = Column(String, nullable=False, default="predefined")

    # Optional producer attribution for statement inclusion
    producer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("producers.id", ondelete="SET NULL"),
        nullable=True,
    )
    producer_initials = Column(String, nullable=True)

    notes = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    producer = relationship("Producer", foreign_keys=[producer_id])
