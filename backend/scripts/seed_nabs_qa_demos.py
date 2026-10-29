"""Seed 2 Orders-tab demo rows per form category. Program name: NABS QA."""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.order import Order
from app.seed.ids import seed_uuid

# Two demos × five Orders tabs.
NABS_QA_DEMOS = [
    # --- School / All Star Cheer ---
    {
        "legacy_id": "nabs-qa-cheer-1",
        "form_type": "school-all-star-cheer",
        "cheer_form_subtype": "all-star-cheer",
        "package_type": "GOLD 2:00",
        "package": "GOLD 2:00",
        "time_length_of_mix": "2:00",
        "music_affiliate": "Power Music Covers",
        "price": 700.0,
        "team_name": "Open",
        "team_coed_all_girl": "All Girl",
        "colors": "Black / Gold",
        "division": "Level 5",
    },
    {
        "legacy_id": "nabs-qa-cheer-2",
        "form_type": "school-all-star-cheer",
        "cheer_form_subtype": "all-star-cheer",
        "package_type": "PLATINUM 2:30",
        "package": "PLATINUM 2:30",
        "time_length_of_mix": "2:30",
        "music_affiliate": "Non compliant",
        "price": 850.0,
        "team_name": "Elite",
        "team_coed_all_girl": "Coed",
        "colors": "Navy / White",
        "division": "Level 4",
    },
    # --- School / All Star Dance ---
    {
        "legacy_id": "nabs-qa-dance-1",
        "form_type": "school-all-star-dance",
        "dance_form_subtype": "pom",
        "package_type": "CUSTOM POM",
        "package": "CUSTOM POM",
        "time_length_of_mix": "2:00-2:05",
        "music_affiliate": "Power Music Covers",
        "price": 850.0,
        "division": "small senior advanced pom",
    },
    {
        "legacy_id": "nabs-qa-dance-2",
        "form_type": "school-all-star-dance",
        "dance_form_subtype": "hip-hop",
        "package_type": "DANCE MIX",
        "package": "DANCE MIX",
        "time_length_of_mix": "1:50-1:55",
        "music_affiliate": "Power Music Covers",
        "price": 475.0,
        "division": "open hip hop",
    },
    # --- Marching Band ---
    {
        "legacy_id": "nabs-qa-mb-1",
        "form_type": "marching-band",
        "package_type": "BAND CHANT",
        "package": "BAND CHANT",
        "time_length_of_mix": "1:30",
        "music_affiliate": "Power Music Covers",
        "price": 600.0,
    },
    {
        "legacy_id": "nabs-qa-mb-2",
        "form_type": "marching-band",
        "package_type": "DRUM CADENCE ORIGINAL",
        "package": "DRUM CADENCE ORIGINAL",
        "time_length_of_mix": "0:55",
        "music_affiliate": None,
        "price": 350.0,
    },
    # --- Sports Entertainment ---
    {
        "legacy_id": "nabs-qa-se-1",
        "form_type": "sports-entertainment",
        "package_type": "QUARTER BREAK / TIMEOUT REMIXED",
        "package": "QUARTER BREAK / TIMEOUT REMIXED",
        "time_length_of_mix": "1:00",
        "is_rush_order": "No",
        "price": 400.0,
    },
    {
        "legacy_id": "nabs-qa-se-2",
        "form_type": "sports-entertainment",
        "package_type": "PRE-GAME / HALFTIME REMIXED",
        "package": "PRE-GAME / HALFTIME REMIXED",
        "time_length_of_mix": "2:00",
        "is_rush_order": "Yes",
        "price": 550.0,
    },
    # --- School Anthem ---
    {
        "legacy_id": "nabs-qa-sa-1",
        "form_type": "school-anthem",
        "package_type": "SCHOOL ANTHEMS",
        "package": "SCHOOL ANTHEMS",
        "price": 1250.0,
        "mascot": "Hawks",
        "colors": "Blue & Gold",
        "vocals_preference": "Mixed vocals",
    },
    {
        "legacy_id": "nabs-qa-sa-2",
        "form_type": "school-anthem",
        "package_type": "SCHOOL ANTHEMS",
        "package": "SCHOOL ANTHEMS",
        "price": 1250.0,
        "mascot": "Wolves",
        "colors": "Crimson & Silver",
        "vocals_preference": "Male vocals",
    },
]


def main() -> None:
    db = SessionLocal()
    created = 0
    updated = 0
    try:
        for i, row in enumerate(NABS_QA_DEMOS, 1):
            legacy = row["legacy_id"]
            order_pk = seed_uuid("order", legacy)
            existing = db.query(Order).filter(Order.id == order_pk).first()

            n = ((i - 1) % 2) + 1  # 1 or 2 within category pair
            coach = f"NABS Coach {legacy.split('-')[-2]} {n}"
            kwargs = dict(
                id=order_pk,
                form_type=row["form_type"],
                cheer_form_subtype=row.get("cheer_form_subtype"),
                dance_form_subtype=row.get("dance_form_subtype"),
                school_gym_name="NABS QA",
                school_gym_billing_address=f"{900 + i} NABS QA Way",
                city="Dallas",
                state_province="TX",
                zip_postal_code="75001",
                country="United States",
                team_name=row.get("team_name") or f"Team {n}",
                team_coed_all_girl=row.get("team_coed_all_girl"),
                colors=row.get("colors") or "Black / White",
                division=row.get("division"),
                mascot=row.get("mascot"),
                number_of_copies="1",
                coach_name=coach,
                coach_phone=f"555-9{i:03d}",
                coach_email=f"nabs.qa{i}@example.com",
                billing_person_name=f"NABS Billing {n}",
                billing_person_email=f"nabs.billing{i}@example.com",
                package_type=row["package_type"],
                package=row["package"],
                time_length_of_mix=row.get("time_length_of_mix"),
                music_affiliate=row.get("music_affiliate"),
                sending_eight_count_sheets="Yes"
                if row["form_type"]
                in ("school-all-star-cheer", "school-all-star-dance")
                else None,
                song_list_suggestions="NABS QA demo song list",
                routine_notes="NABS QA demo routine notes",
                vocals_preference=row.get("vocals_preference"),
                is_rush_order=row.get("is_rush_order"),
                client_requested_rush_order=row.get("is_rush_order"),
                how_did_you_find_out="Word of Mouth",
                customer_name=f"{coach} (NABS QA)",
                contact_name=coach,
                editor_initials="FA",
                requested_editor="First Available",
                status="new",
                price=float(row["price"]),
                price_compliance="compliant"
                if (row.get("music_affiliate") or "").lower().find("non") < 0
                else "non-compliant",
                is_manual_entry=False,
            )

            if existing:
                for key, value in kwargs.items():
                    if key == "id":
                        continue
                    setattr(existing, key, value)
                updated += 1
                print(f"update {legacy} → NABS QA ({row['form_type']})")
            else:
                db.add(Order(**kwargs))
                created += 1
                print(f"create {legacy} → NABS QA ({row['form_type']})")

        db.commit()
        print(f"\nDone. created={created} updated={updated} total={len(NABS_QA_DEMOS)}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
