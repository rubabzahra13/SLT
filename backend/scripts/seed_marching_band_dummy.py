"""Insert Marching Band demo orders for local UI testing."""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.order import Order
from app.seed.ids import seed_uuid

# One demo per Magento PACKAGE TYPE option (exact rate-card keys).
MARCHING_BAND_DEMO = [
    {
        "legacy_id": "demo-mb-1",
        "school_program_name": "Lakeside Marching Band",
        "package_type": "DRUM CADENCE ORIGINAL",
        "package": "DRUM CADENCE ORIGINAL",
        "time_length_of_mix": "0:55",
        "price": 350.0,
        "instrumentation_notes": "Full brass & percussion. Emphasize snare cadence.",
        "lyrical_notes": "",
    },
    {
        "legacy_id": "demo-mb-2",
        "school_program_name": "Pride of the Valley Band",
        "package_type": "BAND CHANT",
        "package": "BAND CHANT",
        "time_length_of_mix": "1:30",
        "price": 600.0,
        "instrumentation_notes": "Cover in marching band style: Seven Nation Army — The White Stripes",
        "lyrical_notes": "",
    },
    {
        "legacy_id": "demo-mb-3",
        "school_program_name": "Highland Marching Panthers",
        "package_type": "FIGHT SONG PLUS",
        "package": "FIGHT SONG PLUS",
        "time_length_of_mix": "2:30",
        "price": 2250.0,
        "instrumentation_notes": "Prefer Ohio State fight song energy on YouTube references.",
        "lyrical_notes": "Colors: navy & gold. Mascot: Panthers. Keywords: Pride, Spirit, Honor.",
    },
    {
        "legacy_id": "demo-mb-4",
        "school_program_name": "Riverdale Collegiate Band",
        "package_type": "FIGHT SONG ORIGINAL",
        "package": "FIGHT SONG ORIGINAL",
        "time_length_of_mix": "2:00",
        "price": 1100.0,
        "instrumentation_notes": "Traditional collegiate fight song — no lyrics package.",
        "lyrical_notes": "",
    },
    {
        "legacy_id": "demo-mb-5",
        "school_program_name": "Summit High Alma Band",
        "package_type": "ALMA MATER ORIGINAL",
        "package": "ALMA MATER ORIGINAL",
        "time_length_of_mix": "2:00",
        "price": 1100.0,
        "instrumentation_notes": "Classic alma mater arrangement for pep band.",
        "lyrical_notes": "",
    },
    {
        "legacy_id": "demo-mb-6",
        "school_program_name": "Cedar Grove Spirit Band",
        "package_type": "ALMA MATER PLUS",
        "package": "ALMA MATER PLUS",
        "time_length_of_mix": "2:30",
        "price": 2250.0,
        "instrumentation_notes": "Alma mater with written & recorded lyrics.",
        "lyrical_notes": "School colors: crimson & silver. Mascot: Wolves. Keywords: Honor, Legacy, Home.",
    },
]


def main() -> None:
    db = SessionLocal()
    created = 0
    try:
        for i, row in enumerate(MARCHING_BAND_DEMO, 1):
            legacy = row["legacy_id"]
            order_pk = seed_uuid("order", legacy)
            existing = db.query(Order).filter(Order.id == order_pk).first()
            if existing:
                print(f"skip {legacy} (exists)")
                continue

            order = Order(
                id=order_pk,
                form_type="marching-band",
                school_gym_name=row["school_program_name"],
                school_gym_billing_address=f"{1100 + i} Band Field Rd",
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
                song_list_suggestions=row["instrumentation_notes"] or None,
                routine_notes=row["lyrical_notes"] or None,
                music_affiliate=None,
                customer_name=f"Director Morgan {i} ({row['school_program_name']})",
                contact_name=f"Director Morgan {i}",
                editor_initials="FA",
                requested_editor="First Available",
                status="new",
                price=float(row.get("price") or (350.0 + (i * 50))),
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
