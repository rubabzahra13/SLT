"""Insert one unmatched manual New Order demo per form family (Form pill in Collections)."""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.order import Order
from app.seed.ids import seed_uuid

MANUAL_DEMOS = [
    {
        "legacy_id": "demo-manual-mb-1",
        "form_type": "marching-band",
        "school_gym_name": "Manual Slot: Westfield Band",
        "package": "BAND CHANT",
        "package_type": "BAND CHANT",
        "contact": "Director Pat Manual",
        "price": 0.0,
    },
    {
        "legacy_id": "demo-manual-se-1",
        "form_type": "sports-entertainment",
        "school_gym_name": "Manual Slot: Arena Hype Crew",
        "package": "PRE-GAME / HALFTIME REMIXED",
        "package_type": "PRE-GAME / HALFTIME REMIXED",
        "contact": "Contact Jordan Manual",
        "price": 0.0,
    },
    {
        "legacy_id": "demo-manual-dance-1",
        "form_type": "school-all-star-dance",
        "dance_form_subtype": "pom",
        "school_gym_name": "Manual Slot: Riverside POM",
        "package": "Custom POM 2:15",
        "package_type": "Custom POM",
        "time_length_of_mix": "2:15",
        "contact": "Coach Sam Manual",
        "price": 0.0,
    },
    {
        "legacy_id": "demo-manual-cheer-1",
        "form_type": "school-all-star-cheer",
        "cheer_form_subtype": "all-star-cheer",
        "school_gym_name": "Manual Slot: Thunder Elite",
        "package": "Platinum 2:30",
        "package_type": "Platinum",
        "time_length_of_mix": "2:30",
        "contact": "Coach Alex Manual",
        "price": 0.0,
    },
    {
        "legacy_id": "demo-manual-anthem-1",
        "form_type": "school-anthem",
        "school_gym_name": "Manual Slot: Highland Anthem",
        "package": "SCHOOL ANTHEMS",
        "package_type": "SCHOOL ANTHEMS",
        "contact": "Director Riley Manual",
        "price": 1250.0,
    },
]


def main() -> None:
    db = SessionLocal()
    created = 0
    try:
        for row in MANUAL_DEMOS:
            oid = seed_uuid("order", row["legacy_id"])
            existing = db.query(Order).filter(Order.id == oid).first()
            if existing:
                existing.is_manual_entry = True
                existing.merged_form_order_id = None
                existing.manual_overlap_snapshot = None
                print(f"skip {row['legacy_id']} (exists, kept manual)")
                continue

            order = Order(
                id=oid,
                form_type=row["form_type"],
                cheer_form_subtype=row.get("cheer_form_subtype"),
                dance_form_subtype=row.get("dance_form_subtype"),
                school_gym_name=row["school_gym_name"],
                coach_name=row["contact"],
                contact_name=row["contact"],
                customer_name=f"{row['contact']} ({row['school_gym_name']})",
                coach_email=f"{row['legacy_id']}@example.com",
                package=row["package"],
                package_type=row["package_type"],
                time_length_of_mix=row.get("time_length_of_mix"),
                editor_initials="FA",
                requested_editor="First Available",
                status="new",
                order_status="Complete",
                price=float(row["price"]),
                is_manual_entry=True,
                needs_attention=True,
                is_past_order=False,
            )
            db.add(order)
            created += 1
            print(f"created {row['legacy_id']}: {row['school_gym_name']}")

        db.commit()
        print(f"Done. Created {created} manual demo order(s).")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
