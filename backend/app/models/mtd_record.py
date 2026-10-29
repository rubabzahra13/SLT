import uuid
from sqlalchemy import (
    Column,
    String,
    Boolean,
    Integer,
    Numeric,
    DateTime,
    ForeignKey,
    Index,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class MTDRecord(Base):
    """Music To Do board / payroll lifecycle row.

    Source-of-truth split (Phase 0-5):
    - Orders: identity, assignment, collection/ops (CS/songs/collection_states/
      emails/needs_attention/order_status), pricing/payout.
    - MTD_Records: board/payroll lifecycle only: section, invoice, waiting_on,
      record_status, status, in_mtd, in_payroll, paid_at,
      is_manual_schedule_entry, completed_at, customer-price display cache.
    Order-SoT fields are projected from the linked Order on read.
    """

    __tablename__ = "mtd_records"
    __table_args__ = (
        Index(
            "uq_mtd_records_order_id",
            "order_id",
            unique=True,
            postgresql_where=text("order_id IS NOT NULL"),
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="SET NULL"),
        nullable=True,
    )
    section = Column(String, nullable=False, default="CHEERLEADING MUSIC")

    price = Column(Numeric(10, 2), nullable=False, default=0.0)
    price_compliance = Column(String, default="compliant", nullable=False)
    invoice = Column(String, default="", nullable=False)
    waiting_on = Column(String, nullable=True)
    status = Column(String, default="active", nullable=False)
    record_status = Column(String, nullable=True)
    in_mtd = Column(Boolean, default=True, nullable=False)
    in_payroll = Column(Boolean, default=False, nullable=False)
    is_manual_schedule_entry = Column(Boolean, default=False, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    has_extend_8ct_addon = Column(Boolean, default=False, nullable=False)
    has_processing_8ct_sheets_addon = Column(Boolean, default=False, nullable=False)
    # Dance payroll add-ons (board toggles → Complete-to-Payroll / statements).
    extra_songs_quantity = Column(Integer, default=0, nullable=False)
    extra_song_editing_time_quantity = Column(Integer, default=0, nullable=False)

    # Board display cache for customer price (Orders remains SoT for payout).
    final_customer_price = Column(Numeric(10, 2), nullable=True)
    final_customer_price_overridden = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    order = relationship("Order", back_populates="mtd_record")
