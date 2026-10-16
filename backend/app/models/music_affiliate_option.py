import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class MusicAffiliateOption(Base):
    """
    SoftSelect + compliance catalog per Pricing Reference category/subtype.

    form_type + subtype_id mirror pricing_rules (e.g. school-all-star-cheer /
    all-star-cheer). V!ROC Yes/No both resolve to subtype_id=school-cheer.
    """

    __tablename__ = "music_affiliate_options"
    __table_args__ = (
        UniqueConstraint(
            "form_type",
            "subtype_id",
            "option_key",
            name="uq_music_affiliate_options_form_subtype_key",
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    form_type = Column(String, nullable=False, index=True)
    # Empty string for forms without a subtype dimension (marching-band, etc.).
    subtype_id = Column(String, nullable=False, default="", index=True)

    # Stable id used by the admin UI (e.g. power-music-unleash-covers).
    option_key = Column(String, nullable=False)
    label = Column(String, nullable=False)
    is_compliant = Column(Boolean, nullable=False, default=True)
    # When False, option is hidden from SoftSelect / new-order catalogs.
    enabled = Column(Boolean, nullable=False, default=True)
    sort_order = Column(Integer, nullable=False, default=0)

    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
