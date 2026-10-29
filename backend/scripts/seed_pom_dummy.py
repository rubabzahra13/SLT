"""Insert POM (school-all-star-dance / pom) demo orders for local UI testing."""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.order import Order
from app.seed.ids import seed_uuid

POM_DEMO = [
    {
        "legacy_id": "demo-pom-1",
        "school_program_name": "Westfield High Pom",
        "division": "small senior advanced pom",
        "package_type": "DANCE MIX",
        "package": "DANCE MIX",
        "time_length_of_mix": "1:50-1:55",
        "music_affiliate": "Power Music Covers",
        "custom_voiceovers": "Yes - Traditional $25",
        "power_music_covers": "1) Fight Song Remix\n2) Top 40 Hit",
        "song_list_suggestions": "",
    },
    {
        "legacy_id": "demo-pom-2",
        "school_program_name": "Lakeside Dance Academy",
        "division": "large junior pom",
        "package_type": "DANCE PLUS",
        "package": "DANCE PLUS",
        "time_length_of_mix": "2:00-2:05",
        "music_affiliate": "Power Music Covers, Unleash the Beats Covers",
        "custom_voiceovers": "No - None",
        "power_music_covers": "1) Power cover A",
        "song_list_suggestions": "1) Unleash track B",
    },
    {
        "legacy_id": "demo-pom-3",
        "school_program_name": "Cascade High Pom",
        "division": "open pom",
        "package_type": "CUSTOM POM",
        "package": "CUSTOM POM",
        "time_length_of_mix": "2:20-2:25",
        "music_affiliate": "Non compliant",
        "custom_voiceovers": "Yes - Themed (up to 5) $75",
        "power_music_covers": "",
        "song_list_suggestions": "",
    },
    {
        "legacy_id": "demo-pom-4",
        "school_program_name": "Summit Rally Pom",
        "division": "small varsity pom",
        "package_type": "RALLY MIX",
        "package": "RALLY MIX",
        "time_length_of_mix": "1:00",
        "music_affiliate": "Power Music Covers",
        "custom_voiceovers": "No - None",
        "power_music_covers": "1) Short pep-band hype cut",
        "song_list_suggestions": "",
        "price": 350.0,
    },
]


def main() -> None:
    db = SessionLocal()
    created = 0
    try:
        for i, row in enumerate(POM_DEMO, 1):
            legacy = row["legacy_id"]
            order_pk = seed_uuid("order", legacy)
            existing = db.query(Order).filter(Order.id == order_pk).first()
            if existing:
                print(f"skip {legacy} (exists)")
                continue

            order = Order(
                id=order_pk,
                form_type="school-all-star-dance",
                dance_form_subtype="pom",
                school_gym_name=row["school_program_name"],
                school_gym_billing_address=f"{600 + i} Pom Lane",
                city="Minneapolis",
                state_province="MN",
                zip_postal_code="55401",
                country="United States",
                division=row["division"],
                coach_name=f"Coach Avery {i}",
                coach_phone=f"555-060{i}",
                coach_email=f"avery.pom{i}@example.com",
                billing_person_name=f"Pom Booster {i}",
                billing_person_email=f"booster.pom{i}@example.com",
                choreographer_name="N/A" if i == 1 else f"Choreo Pom {i}",
                choreographer_email="N/A" if i == 1 else f"choreo.pom{i}@example.com",
                number_of_copies="1",
                package_type=row["package_type"],
                package=row["package"],
                time_length_of_mix=row["time_length_of_mix"],
                music_affiliate=row["music_affiliate"],
                song_list_suggestions=(
                    ("Power Music Covers:
" + (row["power_music_covers"] or "") +
                     "

Unleash the Beats Covers:
" + (row.get("unleash_the_beats_covers") or ""))
                    if (row.get("power_music_covers") or row.get("unleash_the_beats_covers"))
                    else None
                ),
                song_list_suggestions=row["song_list_suggestions"] or None,
                routine_notes="Crisp pom accents. Strong kick section.",
                custom_voiceovers=row["custom_voiceovers"],
                voiceover_script='"Go Hawks" & "Turner"' if "Yes" in row["custom_voiceovers"] else None,
                pronunciation_guidance="Hawks like baseball Hawks" if "Yes" in row["custom_voiceovers"] else None,
                coupon_code="POM2026" if i % 2 == 0 else None,
                customer_name=f"Coach Avery {i} ({row['school_program_name']})",
                contact_name=f"Coach Avery {i}",
                editor_initials="FA",
                requested_editor="First Available",
                status="new",
                price=float(row.get("price") or (475.0 + (i * 25))),
                price_compliance="compliant" if "Non compliant" not in row["music_affiliate"] else "nonCompliant",
                needs_attention=False,
                is_past_order=False,
            )
            db.add(order)
            created += 1
            print(f"created {legacy}: {row['school_program_name']}")

        db.commit()
        print(f"Done. Created {created} POM demo order(s).")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
