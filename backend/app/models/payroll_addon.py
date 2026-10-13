import uuid
from sqlalchemy import Boolean, Column, Integer, String, Numeric, DateTime, ForeignKey, func, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class PayrollAddon(Base):
    __tablename__ = "payroll_addons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    program_name = Column(String, nullable=False)
    contact_name = Column(String, nullable=True)
    team_name = Column(String, nullable=True)

    # Optional order / mtd row binding
    order_id = Column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="SET NULL"),
        nullable=True,
    )
    mtd_id = Column(
        UUID(as_uuid=True),
        ForeignKey("mtd_records.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # "Cheer" or "Dance"
    category = Column(String, nullable=False)

    # "voiceover" or "rush_fee"
    addon_type = Column(String, nullable=False)

    # Customer dollar amount (for rush fees: unit_amount × quantity)
    amount = Column(Numeric(10, 2), nullable=False)

    # Rush fee inputs. Null on voiceover rows and on legacy rush rows
    # that only stored `amount`. Compensation rate is the order-specific
    # override (fraction, 0.93 = 93%). Null means use the assigned
    # producer's rush_fee_rate.
    quantity = Column(Integer, nullable=True)
    unit_amount = Column(Numeric(10, 2), nullable=True)
    compensation_rate = Column(Numeric(5, 4), nullable=True)
    compensation_overridden = Column(
        Boolean, nullable=False, default=False, server_default="false"
    )

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
    order = relationship("Order", foreign_keys=[order_id])

