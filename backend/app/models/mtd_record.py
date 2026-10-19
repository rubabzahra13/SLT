import uuid
from sqlalchemy import (
    Column,
    String,
    Boolean,
    Text,
    Numeric,
    Date,
    DateTime,
    ForeignKey,
    Index,
    func,
    JSON,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class MTDRecord(Base):
    """Music To Do board / payroll lifecycle row.

    Source-of-truth split (Phase 0–2 + Phase 1 drops):
    - Orders: customer/form intake, package, assignment schedule, and pricing/payout
      writes (complete-pricing / finalize-payroll / package-price chip), including
      system_calculated_*, producer_payout, rate_*, pricing_breakdown.
    - MTD_Records: board flags (in_mtd, record_status, in_payroll, paid_at, invoice)
      plus customer-price display cache (price, final_customer_price*,
      price_compliance). Linked 1:1 via order_id (uq_mtd_records_order_id).
      Never write pricing/payout back from MTD onto Orders.
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
    # Nullable FK: rare orphans allowed; non-null values unique (partial index).
    order_id = Column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="SET NULL"),
        nullable=True,
    )
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
    # Admin collection status (HAVE CS / NEED CS).
    received_eight_count_sheet = Column(String, default="", nullable=False)
    have_songs = Column(String, default="", nullable=False)
    collection_states = Column(JSON, nullable=True)
    order_status = Column(String, nullable=True)
    needs_attention = Column(Boolean, default=False, nullable=False)
    status = Column(String, default="active", nullable=False)
    record_status = Column(String, nullable=True)
    in_mtd = Column(Boolean, default=True, nullable=False)
    is_reassigned = Column(Boolean, default=False, nullable=False)
    missing_data_email_sent_at = Column(DateTime(timezone=True), nullable=True)
    producer_email_sent_at = Column(DateTime(timezone=True), nullable=True)
    producer_email_sent_to = Column(String, nullable=True)
    in_payroll = Column(Boolean, default=False, nullable=False)
    is_manual_schedule_entry = Column(Boolean, default=False, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    # When marked Paid — moves from View Payroll into Archive.
    paid_at = Column(DateTime(timezone=True), nullable=True)
    has_extend_8ct_addon = Column(Boolean, default=False, nullable=False)
    has_processing_8ct_sheets_addon = Column(Boolean, default=False, nullable=False)

    # Board display cache for customer price (Orders remains SoT for payout/
    # system calc / rates — see Phase 1+2). Do not store producer_payout here.
    final_customer_price = Column(Numeric(10, 2), nullable=True)
    final_customer_price_overridden = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    order = relationship("Order", back_populates="mtd_record")
    assigned_producer = relationship("Producer", back_populates="mtd_records")
