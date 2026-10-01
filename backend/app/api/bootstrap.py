"""Application bootstrap — one request, one DB session, all core lists.

Avoids N parallel Vercel Python cold starts on first page load.
"""
from typing import Any, Dict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, selectinload

from app.api.studio_settings import _ensure_default_holidays, _ensure_default_reasons
from app.core.database import get_db
from app.models.discount_code import DiscountCode
from app.models.mtd_record import MTDRecord
from app.models.order import Order
from app.models.payroll_addon import PayrollAddon
from app.models.producer import Producer
from app.models.studio_settings import EmailTemplate
from app.schemas.discount_code import DiscountCodeSchema
from app.schemas.mtd_record import MTDRecordSchema
from app.schemas.order import OrderSchema
from app.schemas.payroll_addon import PayrollAddonOut
from app.schemas.producer import ProducerSchema
from app.schemas.studio_settings import (
    EmailTemplateSchema,
    StudioHolidaySchema,
    StudioPersonalReasonSchema,
)

router = APIRouter()


@router.get("/bootstrap")
def bootstrap(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Load all primary lists in a single serverless invocation."""
    producers = (
        db.query(Producer)
        .options(selectinload(Producer.time_offs))
        .order_by(Producer.name.asc())
        .all()
    )
    orders = db.query(Order).order_by(Order.created_at.desc()).all()
    mtd = db.query(MTDRecord).order_by(MTDRecord.created_at.desc()).all()
    codes = db.query(DiscountCode).order_by(DiscountCode.code.asc()).all()
    addons = db.query(PayrollAddon).order_by(PayrollAddon.created_at.desc()).all()
    holidays = _ensure_default_holidays(db)
    reasons = _ensure_default_reasons(db)
    templates = db.query(EmailTemplate).order_by(EmailTemplate.id.asc()).all()

    return {
        "producers": [
            ProducerSchema.model_validate(p).model_dump(mode="json") for p in producers
        ],
        "orders": [OrderSchema.model_validate(o).model_dump(mode="json") for o in orders],
        "mtd": [MTDRecordSchema.model_validate(r).model_dump(mode="json") for r in mtd],
        "discount_codes": [
            DiscountCodeSchema.model_validate(c).model_dump(mode="json") for c in codes
        ],
        "payroll_addons": [
            PayrollAddonOut.model_validate(a).model_dump(mode="json") for a in addons
        ],
        "studio_holidays": [
            StudioHolidaySchema.model_validate(h).model_dump(mode="json") for h in holidays
        ],
        "studio_personal_reasons": [
            StudioPersonalReasonSchema.model_validate(r).model_dump(mode="json")
            for r in reasons
        ],
        "email_templates": [
            EmailTemplateSchema.model_validate(t).model_dump(mode="json") for t in templates
        ],
    }
