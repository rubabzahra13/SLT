"""Insert School Anthem demo orders for local UI testing."""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.order import Order
from app.seed.ids import seed_uuid

SCHOOL_ANTHEM_DEMO = [
    {
        "legacy_id": "demo-sa-1",
        "school_program_name": "Monument Valley High",
        "mascot": "Mustangs",
        "colors": "Red, White and Blue",
        "nicknames": "MHS, 'Stangs'",
        "vocals_preference": "Male vocals",
        "instrumentation_notes": "Pop / Rock with marching energy",
        "lyrical_notes": (
            "Include Go Mustangs, Home of the Stangs, and ASB pride chants. "
            "Mention football, basketball, and student section."
        ),
    },
    {
        "legacy_id": "demo-sa-2",
        "school_program_name": "Lake Travis High School",
        "mascot": "Cavaliers",
        "colors": "Red, Black, and White",
        "nicknames": "LT Cavs",
        "vocals_preference": "Mixed vocals",
        "instrumentation_notes": "Orchestral Brass & Strings",
        "lyrical_notes": "Hail to the Cavaliers, victorious and strong!",
    },
    {
        "legacy_id": "demo-sa-3",
        "school_program_name": "Horizon Prep",
        "mascot": "Hawks",
        "colors": "Green & Black",
        "nicknames": "Horizon Hawks",
        "vocals_preference": "Choir / Group vocals",
        "instrumentation_notes": "Cinematic anthem with choir pads",
        "lyrical_notes": (
            "Keywords: Rise Up Hawks, Horizon Pride, Clubs & ASB. "
            "Brainstorm with student council mottos."
        ),
    },
]


def main() -> None:
    db = SessionLocal()
    created = 0
    try:
        for i, row in enumerate(SCHOOL_ANTHEM_DEMO, 1):
            legacy = row["legacy_id"]
            order_pk = seed_uuid("order", legacy)
            existing = db.query(Order).filter(Order.id == order_pk).first()
            if existing:
                print(f"skip {legacy} (exists)")
                continue

            order = Order(
                id=order_pk,
                form_type="school-anthem",
                school_gym_name=row["school_program_name"],
                school_gym_billing_address=f"{300 + i} Campus Drive",
                city="Austin",
                state_province="TX",
                zip_postal_code="78701",
                country="United States",
                mascot=row["mascot"],
                colors=row["colors"],
                nicknames=row["nicknames"],
                vocals_preference=row["vocals_preference"],
                song_list_suggestions=row["instrumentation_notes"],
                routine_notes=row["lyrical_notes"],
                coach_name=f"Music Contact Alex {i}",
                coach_phone=f"555-340{i}",
                coach_email=f"anthem.contact{i}@example.com",
                billing_person_name=f"Billing Person {i}",
                billing_person_email=f"billing.sa{i}@school.edu",
                package_type="SCHOOL ANTHEMS",
                package="SCHOOL ANTHEMS",
                coupon_code=f"ANTHEM{i}" if i == 2 else None,
                music_affiliate=None,
                customer_name=f"Music Contact Alex {i} ({row['school_program_name']})",
                contact_name=f"Music Contact Alex {i}",
                editor_initials="FA",
                requested_editor="First Available",
                status="new",
                price=1250.0,
                price_compliance="compliant",
                needs_attention=False,
                is_past_order=False,
            )
            db.add(order)
            created += 1
            print(f"created {legacy} — {row['school_program_name']}")

        db.commit()
        print(f"Done. Created {created} School Anthem demo order(s).")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
