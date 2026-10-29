"""Insert Youth Rec Cheer demo orders for local UI testing."""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.order import Order
from app.seed.ids import seed_uuid

YOUTH_REC_DEMO = [
    {
        "legacy_id": "demo-youth-rec-1",
        "program_name": "Los Angeles Pop Warner Club",
        "team_name": "Mustangs",
        "colors": "gold, black, white",
        "package_type": "BRONZE",
        "package": "BRONZE 1:00",
        "time_length_of_mix": "1:00",
        "split_or_no_split": "Split",
        "using_eight_count_sheets": "No",
        "how_did_you_find_out": "Return Customer",
    },
    {
        "legacy_id": "demo-youth-rec-2",
        "program_name": "Orange County Youth Cheer",
        "team_name": "Thunderbolts",
        "colors": "navy, silver",
        "package_type": "BRONZE",
        "package": "BRONZE 1:30",
        "time_length_of_mix": "1:30",
        "split_or_no_split": "No Split",
        "using_eight_count_sheets": "Yes",
        "how_did_you_find_out": "Instagram",
    },
    {
        "legacy_id": "demo-youth-rec-3",
        "program_name": "Valley Rec Athletics",
        "team_name": "Wildcats",
        "colors": "red, black, white",
        "package_type": "BRONZE",
        "package": "BRONZE 2:00",
        "time_length_of_mix": "2:00",
        "split_or_no_split": "Split",
        "using_eight_count_sheets": "No",
        "how_did_you_find_out": "Word of Mouth",
    },
]


def main() -> None:
    db = SessionLocal()
    created = 0
    try:
        for i, row in enumerate(YOUTH_REC_DEMO, 1):
            legacy = row["legacy_id"]
            order_pk = seed_uuid("order", legacy)
            existing = db.query(Order).filter(Order.id == order_pk).first()
            if existing:
                print(f"skip {legacy} (exists)")
                continue

            order = Order(
                id=order_pk,
                form_type="school-all-star-cheer",
                cheer_form_subtype="youth-rec-cheer",
                school_gym_name=row["program_name"],
                team_name=row["team_name"],
                colors=row["colors"],
                school_gym_billing_address=f"{500 + i} Rec Center Way",
                city="Los Angeles",
                state_province="CA",
                zip_postal_code="90012",
                country="United States",
                coach_name=f"Coach Jordan {i}",
                coach_email=f"jordan.rec{i}@example.com",
                coach_phone=f"555-040{i}",
                billing_person_email=f"parent.rec{i}@example.com",
                package_type=row["package_type"],
                package=row["package"],
                time_length_of_mix=row["time_length_of_mix"],
                split_or_no_split=row["split_or_no_split"],
                number_of_copies="1",
                sending_eight_count_sheets=row["using_eight_count_sheets"],
                song_list_suggestions="1) Power Music Trax hit\n2) Unleash the Beats track",
                routine_notes="Youth-friendly energy. Keep transitions clean for young athletes.",
                coupon_code="YOUTH2026" if i % 2 == 0 else None,
                how_did_you_find_out=row["how_did_you_find_out"],
                music_affiliate=None,
                customer_name=f"Coach Jordan {i} ({row['program_name']})",
                contact_name=f"Coach Jordan {i}",
                editor_initials="FA",
                requested_editor="First Available",
                status="new",
                price=450.0 + (i * 20),
                price_compliance="compliant",
                needs_attention=False,
                is_past_order=False,
            )
            db.add(order)
            created += 1
            print(f"created {legacy}: {row['program_name']}")

        db.commit()
        print(f"Done. Created {created} Youth Rec Cheer demo order(s).")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
