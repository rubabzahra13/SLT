from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.payroll_addon import PayrollAddon
from app.schemas.payroll_addon import PayrollAddonCreate, PayrollAddonOut

router = APIRouter()


@router.get("/payroll-addons", response_model=List[PayrollAddonOut])
def list_payroll_addons(db: Session = Depends(get_db)):
    """Return all payroll add-ons ordered by creation date descending."""
    return (
        db.query(PayrollAddon)
        .order_by(PayrollAddon.created_at.desc())
        .all()
    )


@router.post("/payroll-addons", response_model=PayrollAddonOut, status_code=201)
def create_payroll_addon(
    payload: PayrollAddonCreate, db: Session = Depends(get_db)
):
    """Create a new standalone payroll add-on (voiceover or rush fee)."""
    addon = PayrollAddon(**payload.model_dump())
    db.add(addon)
    db.commit()
    db.refresh(addon)
    return addon


@router.delete("/payroll-addons/{addon_id}", status_code=204)
def delete_payroll_addon(addon_id: UUID, db: Session = Depends(get_db)):
    """Delete a payroll add-on by ID."""
    addon = db.query(PayrollAddon).filter(PayrollAddon.id == addon_id).first()
    if not addon:
        raise HTTPException(status_code=404, detail="Payroll add-on not found")
    db.delete(addon)
    db.commit()
