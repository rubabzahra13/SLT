"""Insert Team Performance & Variety demo orders for local UI testing."""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.order import Order

TPV_DEMO = [
    {
        "legacy_id": "demo-tpv-1",
        "school_program_name": "Evergreen Performance Team",
        "division": "small senior advanced pom",
        "style": "Team Performance",
        "package_type": "TP MIX",
        "package": "TP MIX",
        "time_length_of_mix": "1:50-1:55",
        "music_affiliate": "Power Music Covers",
        "custom_voiceovers": "Yes - Traditional $25",
        "power_music_covers": "1) Opening hit\n2) Mid-tempo groove",
        "song_list_suggestions": "",
    },
    {
        "legacy_id": "demo-tpv-2",
        "school_program_name": "Northern Lights Dance",
        "division": "open variety",
        "style": "Variety",
        "package_type": "TP PLUS MIX",
        "package": "TP PLUS MIX",
        "time_length_of_mix": "2:00-2:05",
        "music_affiliate": "Power Music Covers, Unleash the Beats Covers",
        "custom_voiceovers": "No - None",
        "power_music_covers": "1) Power variety A",
        "song_list_suggestions": "1) Unleash variety B",
    },
    {
        "legacy_id": "demo-tpv-3",
        "school_program_name": "Pacific Performance Studio",
        "division": "varsity performance",
        "style": "Team Performance",
        "package_type": "TP MIX",
        "package": "TP MIX",
        "time_length_of_mix": "2:15-2:20",
        "music_affiliate": "Non compliant",
        "custom_voiceovers": "Yes - Themed (up to 5) $75",
        "power_music_covers": "",
        "song_list_suggestions": "",
    },
]


def main() -> None:
    db = SessionLocal()
    created = 0
    try:
        for i, row in enumerate(TPV_DEMO, 1):
            legacy = row["legacy_id"]
            existing = db.query(Order).filter(Order.legacy_id == legacy).first()
            if existing:
                print(f"skip {legacy} (exists)")
                continue

            order = Order(
                legacy_id=legacy,
                form_type="school-all-star-dance",
                dance_form_subtype="team-performance-variety",
                category="Dance",
                school_program_name=row["school_program_name"],
                school_address=f"{800 + i} Performance Way",
                city="Seattle",
                state_province="WA",
                zip_postal_code="98101",
                country="United States",
                division=row["division"],
                style=row["style"],
                coach_name=f"Coach Morgan {i}",
                coach_phone=f"555-080{i}",
                coach_email=f"morgan.tpv{i}@example.com",
                billing_person_name=f"TPV Booster {i}",
                billing_person_email=f"booster.tpv{i}@example.com",
                choreographer_name="N/A" if i == 1 else f"Choreo TPV {i}",
                choreographer_email="N/A" if i == 1 else f"choreo.tpv{i}@example.com",
                number_of_copies="1",
                package_type=row["package_type"],
                package=row["package"],
                time_length_of_mix=row["time_length_of_mix"],
                music_affiliate=row["music_affiliate"],
                power_music_covers=row["power_music_covers"] or None,
                song_list_suggestions=row["song_list_suggestions"] or None,
                routine_notes=(
                    "Pom 0:00–0:45 (8 eights), Jazz 0:45–1:30 (8 eights), "
                    "Hip Hop finish 1:30–end."
                ),
                custom_voiceovers=row["custom_voiceovers"],
                voiceover_script="Go Hawks" if "Yes" in row["custom_voiceovers"] else None,
                pronunciation_guidance="Hawks like baseball Hawks" if "Yes" in row["custom_voiceovers"] else None,
                coupon_code="TPV2026" if i % 2 == 0 else None,
                customer_name=f"Coach Morgan {i} ({row['school_program_name']})",
                contact_name=f"Coach Morgan {i}",
                program_name=row["school_program_name"],
                editor_request="FA",
                requested_editor="First Available",
                requested_producer="FA",
                status="new",
                price=500.0 + (i * 25),
                price_compliance="compliant" if "Non compliant" not in row["music_affiliate"] else "nonCompliant",
                needs_attention=False,
                is_past_order=False,
            )
            db.add(order)
            created += 1
            print(f"created {legacy} — {row['school_program_name']}")

        db.commit()
        print(f"Done. Created {created} Team Performance & Variety demo order(s).")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
