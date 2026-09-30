import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.auth import require_full_access
from app.core.database import get_db
from app.models.studio_settings import (
    EmailTemplate,
    StudioHoliday,
    StudioPersonalReason,
)
from app.schemas.studio_settings import (
    EmailTemplateSchema,
    EmailTemplateUpdateSchema,
    StudioHolidayCreateSchema,
    StudioHolidaySchema,
    StudioHolidayUpdateSchema,
    StudioPersonalReasonCreateSchema,
    StudioPersonalReasonSchema,
    StudioPersonalReasonUpdateSchema,
)

router = APIRouter()

DEFAULT_HOLIDAYS = [
    ("New Year's Day", "01-01", "01-01"),
    ("Martin Luther King Jr. Day", "01-19", "01-19"),
    ("Presidents' Day", "02-16", "02-16"),
    ("Memorial Day", "05-25", "05-25"),
    ("Juneteenth", "06-19", "06-19"),
    ("Independence Day", "07-04", "07-04"),
    ("Labor Day", "09-07", "09-07"),
    ("Columbus Day / Indigenous Peoples' Day", "10-12", "10-12"),
    ("Veterans Day", "11-11", "11-11"),
    ("Thanksgiving", "11-26", "11-26"),
    ("Day after Thanksgiving", "11-27", "11-27"),
    ("Christmas Eve", "12-24", "12-24"),
    ("Christmas Day", "12-25", "12-25"),
    ("New Year's Eve", "12-31", "12-31"),
    ("Other holiday", "01-01", "01-01"),
]

DEFAULT_PERSONAL_REASONS = [
    "Vacation",
    "Family",
    "Medical",
    "Personal appointment",
    "Travel",
    "Bereavement",
    "Other",
]


def _is_uuid(val: str) -> bool:
    try:
        uuid.UUID(val)
        return True
    except (ValueError, TypeError, AttributeError):
        return False


def _find_holiday(db: Session, holiday_id: str) -> Optional[StudioHoliday]:
    if _is_uuid(holiday_id):
        row = db.query(StudioHoliday).filter(StudioHoliday.id == uuid.UUID(holiday_id)).first()
        if row:
            return row
    return db.query(StudioHoliday).filter(StudioHoliday.legacy_id == holiday_id).first()


def _find_reason(db: Session, reason_id: str) -> Optional[StudioPersonalReason]:
    if _is_uuid(reason_id):
        row = (
            db.query(StudioPersonalReason)
            .filter(StudioPersonalReason.id == uuid.UUID(reason_id))
            .first()
        )
        if row:
            return row
    return (
        db.query(StudioPersonalReason)
        .filter(StudioPersonalReason.legacy_id == reason_id)
        .first()
    )


def _ensure_default_holidays(db: Session) -> List[StudioHoliday]:
    rows = (
        db.query(StudioHoliday)
        .order_by(StudioHoliday.sort_order.asc(), StudioHoliday.name.asc())
        .all()
    )
    if rows:
        return rows
    for index, (name, start, end) in enumerate(DEFAULT_HOLIDAYS):
        db.add(
            StudioHoliday(
                legacy_id=f"holiday-default-{index + 1}",
                name=name,
                start_date=start,
                end_date=end,
                applies_to_all=True,
                producer_ids=[],
                sort_order=index,
            )
        )
    db.commit()
    return (
        db.query(StudioHoliday)
        .order_by(StudioHoliday.sort_order.asc(), StudioHoliday.name.asc())
        .all()
    )


def _ensure_default_reasons(db: Session) -> List[StudioPersonalReason]:
    rows = (
        db.query(StudioPersonalReason)
        .order_by(StudioPersonalReason.sort_order.asc(), StudioPersonalReason.name.asc())
        .all()
    )
    if rows:
        return rows
    for index, name in enumerate(DEFAULT_PERSONAL_REASONS):
        db.add(
            StudioPersonalReason(
                legacy_id=f"personal-default-{index + 1}",
                name=name,
                enabled=True,
                is_other=name.lower() == "other",
                sort_order=index,
            )
        )
    db.commit()
    return (
        db.query(StudioPersonalReason)
        .order_by(StudioPersonalReason.sort_order.asc(), StudioPersonalReason.name.asc())
        .all()
    )


# ── Holidays ───────────────────────────────────────────────────────────────


@router.get("/studio-holidays", response_model=List[StudioHolidaySchema])
def list_studio_holidays(db: Session = Depends(get_db)):
    return _ensure_default_holidays(db)


@router.post(
    "/studio-holidays",
    response_model=StudioHolidaySchema,
    status_code=status.HTTP_201_CREATED,
)
def create_studio_holiday(
    payload: StudioHolidayCreateSchema,
    db: Session = Depends(get_db),
    _: None = Depends(require_full_access),
):
    row = StudioHoliday(
        legacy_id=payload.legacy_id,
        name=payload.name.strip(),
        start_date=payload.start_date.strip(),
        end_date=payload.end_date.strip(),
        applies_to_all=payload.applies_to_all,
        producer_ids=list(payload.producer_ids or []),
        sort_order=payload.sort_order or 0,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/studio-holidays/{holiday_id}", response_model=StudioHolidaySchema)
def update_studio_holiday(
    holiday_id: str,
    payload: StudioHolidayUpdateSchema,
    db: Session = Depends(get_db),
    _: None = Depends(require_full_access),
):
    row = _find_holiday(db, holiday_id)
    if not row:
        raise HTTPException(status_code=404, detail="Holiday not found")
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/studio-holidays/{holiday_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_studio_holiday(
    holiday_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_full_access),
):
    row = _find_holiday(db, holiday_id)
    if not row:
        raise HTTPException(status_code=404, detail="Holiday not found")
    db.delete(row)
    db.commit()
    return None


# ── Personal reasons ───────────────────────────────────────────────────────


@router.get("/studio-personal-reasons", response_model=List[StudioPersonalReasonSchema])
def list_studio_personal_reasons(db: Session = Depends(get_db)):
    return _ensure_default_reasons(db)


@router.post(
    "/studio-personal-reasons",
    response_model=StudioPersonalReasonSchema,
    status_code=status.HTTP_201_CREATED,
)
def create_studio_personal_reason(
    payload: StudioPersonalReasonCreateSchema,
    db: Session = Depends(get_db),
    _: None = Depends(require_full_access),
):
    row = StudioPersonalReason(
        legacy_id=payload.legacy_id,
        name=payload.name.strip(),
        enabled=payload.enabled,
        is_other=payload.is_other,
        sort_order=payload.sort_order or 0,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch(
    "/studio-personal-reasons/{reason_id}",
    response_model=StudioPersonalReasonSchema,
)
def update_studio_personal_reason(
    reason_id: str,
    payload: StudioPersonalReasonUpdateSchema,
    db: Session = Depends(get_db),
    _: None = Depends(require_full_access),
):
    row = _find_reason(db, reason_id)
    if not row:
        raise HTTPException(status_code=404, detail="Personal reason not found")
    data = payload.model_dump(exclude_unset=True)
    if row.is_other:
        # Locked Other row — keep enabled/is_other
        data.pop("enabled", None)
        data.pop("is_other", None)
        data["enabled"] = True
        data["is_other"] = True
    for key, value in data.items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return row


@router.delete(
    "/studio-personal-reasons/{reason_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_studio_personal_reason(
    reason_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_full_access),
):
    row = _find_reason(db, reason_id)
    if not row:
        raise HTTPException(status_code=404, detail="Personal reason not found")
    if row.is_other:
        raise HTTPException(status_code=400, detail="Cannot delete the Other reason")
    db.delete(row)
    db.commit()
    return None


# ── Email templates ─────────────────────────────────────────────────────────


@router.get("/email-templates", response_model=List[EmailTemplateSchema])
def list_email_templates(db: Session = Depends(get_db)):
    return db.query(EmailTemplate).order_by(EmailTemplate.id.asc()).all()


@router.put("/email-templates/{template_id}", response_model=EmailTemplateSchema)
def upsert_email_template(
    template_id: str,
    payload: EmailTemplateUpdateSchema,
    db: Session = Depends(get_db),
    _: None = Depends(require_full_access),
):
    row = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    data = payload.model_dump(exclude_unset=True)
    if not row:
        row = EmailTemplate(
            id=template_id,
            subject=data.get("subject") or "",
            greeting=data.get("greeting") or "",
            intro=data.get("intro") or "",
            footer=data.get("footer") or "",
            signature=data.get("signature") or "",
        )
        db.add(row)
    else:
        for key, value in data.items():
            setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return row
