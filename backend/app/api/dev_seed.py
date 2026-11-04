"""Local-only helpers for UI testing. Disabled on Vercel."""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.mtd_record import MTDRecord
from app.models.order import Order
from app.models.producer import Producer

router = APIRouter()


def _local_only() -> None:
    if os.getenv("VERCEL"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Not found"
        )


@router.post("/dev/seed-payroll-test")
def seed_payroll_test():
    """Put a few unpaid mixes on Payroll for local UI testing."""
    _local_only()
    db: Session = SessionLocal()
    try:
        before = (
            db.query(MTDRecord)
            .filter(MTDRecord.in_payroll.is_(True), MTDRecord.paid_at.is_(None))
            .count()
        )
        producers = db.query(Producer).limit(8).all()
        ch = next(
            (
                p
                for p in producers
                if str(getattr(p, "initials", "") or "").upper() == "CH"
            ),
            producers[0] if producers else None,
        )
        now = datetime.now(timezone.utc)
        moved: list[dict] = []

        candidates = (
            db.query(MTDRecord)
            .join(Order, MTDRecord.order_id == Order.id)
            .filter(
                or_(
                    MTDRecord.in_payroll.is_(False),
                    MTDRecord.in_payroll.is_(None),
                ),
                MTDRecord.paid_at.is_(None),
                Order.assigned_producer_id.isnot(None),
            )
            .order_by(MTDRecord.updated_at.desc())
            .limit(5)
            .all()
        )
        for i, mtd in enumerate(candidates[:3]):
            order = mtd.order
            mtd.in_payroll = True
            mtd.in_mtd = False
            mtd.status = "completed"
            mtd.record_status = "Completed"
            mtd.paid_at = None
            mtd.completed_at = now - timedelta(days=i)
            if not (mtd.invoice or "").strip():
                mtd.invoice = f"TEST-PAY-{100 + i}"
            if order is not None:
                order.status = "completed"
            moved.append(
                {
                    "invoice": mtd.invoice,
                    "program": getattr(order, "team_name", None)
                    or getattr(order, "school_gym_name", None),
                }
            )

        japan = (
            db.query(MTDRecord)
            .filter(MTDRecord.id == "36382db2-cefd-47a6-83eb-5ad46226833f")
            .first()
        )
        if japan and japan.paid_at:
            japan.paid_at = None
            japan.in_payroll = True
            japan.status = "completed"
            japan.record_status = "Completed"
            moved.append({"invoice": japan.invoice, "program": "TEAM JAPAN"})

        need = max(0, 3 - len(moved))
        for i in range(need):
            oid = uuid4()
            mid = uuid4()
            order = Order(
                id=oid,
                form_type="school-all-star-cheer",
                cheer_form_subtype="all-star-cheer",
                status="completed",
                school_gym_name=f"Test Gym {i + 1}",
                team_name=f"Payroll Test Team {i + 1}",
                coach_name=f"Coach Test {i + 1}",
                customer_name=f"Contact Test {i + 1}",
                contact_name=f"Contact Test {i + 1}",
                package="Silver Package",
                assigned_producer_id=ch.id if ch else None,
                mix_start_date=(now + timedelta(days=2)).date(),
                mix_end_date=(now + timedelta(days=4)).date(),
                created_at=now,
            )
            mtd = MTDRecord(
                id=mid,
                order_id=oid,
                section="CHEERLEADING MUSIC",
                price=Decimal("150"),
                price_compliance="compliant",
                invoice=f"TEST-PAY-NEW-{i + 1}",
                status="completed",
                record_status="Completed",
                in_mtd=False,
                in_payroll=True,
                paid_at=None,
                completed_at=now,
                created_at=now,
            )
            db.add(order)
            db.add(mtd)
            moved.append({"invoice": mtd.invoice, "program": order.team_name})

        db.commit()
        after = (
            db.query(MTDRecord)
            .filter(MTDRecord.in_payroll.is_(True), MTDRecord.paid_at.is_(None))
            .count()
        )
        return {"before": before, "after": after, "seeded": moved}
    finally:
        db.close()
