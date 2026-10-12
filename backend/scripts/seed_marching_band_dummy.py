"""Insert Marching Band demo orders for local UI testing."""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.order import Order

MARCHING_BAND_DEMO = [
    {
        "legacy_id": "demo-mb-1",
        "school_program_name": "Lakeside Marching Band",
        "package_type": "DRUM CADENCE ORIGINAL",
        "package": "DRUM CADENCE ORIGINAL",
        "time_length_of_mix": "1:45",
        "instrumentation_notes": "Full brass & percussion. Emphasize snare cadence.",
        "lyrical_notes": "",
    },
    {
        "legacy_id": "demo-mb-2",
        "school_program_name": "Pride of the Valley Band",
        "package_type": "BAND CHANT",
        "package": "BAND CHANT",
        "time_length_of_mix": "1:30",
        "instrumentation_notes": "Cover in marching band style: Seven Nation Army — The White Stripes",
        "lyrical_notes": "",
    },
    {
        "legacy_id": "demo-mb-3",
        "school_program_name": "Highland Marching Panthers",
        "package_type": "FIGHT SONG PLUS",
        "package": "FIGHT SONG PLUS",
        "time_length_of_mix": "2:30",
        "instrumentation_notes": "Prefer Ohio State fight song energy on YouTube references.",
        "lyrical_notes": "Colors: navy & gold. Mascot: Panthers. Keywords: Pride, Spirit, Honor.",
    },
]


def main() -> None:
    db = SessionLocal()
    created = 0
    try:
        for i, row in enumerate(MARCHING_BAND_DEMO, 1):
            legacy = row["legacy_id"]
            existing = db.query(Order).filter(Order.legacy_id == legacy).first()
            if existing:
                print(f"skip {legacy} (exists)")
                continue

            order = Order(
                legacy_id=legacy,
                form_type="marching-band",
                category="Marching Band",
                school_program_name=row["school_program_name"],
                school_address=f"{1100 + i} Band Field Rd",
                city="Indianapolis",
                state_province="IN",
                zip_postal_code="46201",
                country="United States",
                coach_name=f"Director Morgan {i}",
                coach_phone=f"555-110{i}",
                coach_email=f"morgan.mb{i}@example.com",
                billing_person_name=f"Band Boosters {i}",
                billing_person_email=f"boosters.mb{i}@school.edu",
                package_type=row["package_type"],
                package=row["package"],
                time_length_of_mix=row["time_length_of_mix"],
                instrumentation_notes=row["instrumentation_notes"] or None,
                lyrical_notes=row["lyrical_notes"] or None,
                music_affiliate=None,
                customer_name=f"Director Morgan {i} ({row['school_program_name']})",
                contact_name=f"Director Morgan {i}",
                program_name=row["school_program_name"],
                editor_request="FA",
                requested_editor="First Available",
                requested_producer="FA",
                status="new",
                price=350.0 + (i * 50),
                price_compliance="compliant",
                needs_attention=False,
                is_past_order=False,
            )
            db.add(order)
            created += 1
            print(f"created {legacy} — {row['school_program_name']}")

        db.commit()
        print(f"Done. Created {created} Marching Band demo order(s).")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
