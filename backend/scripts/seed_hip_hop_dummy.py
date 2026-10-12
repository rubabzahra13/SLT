"""Insert Hip Hop (school-all-star-dance / hip-hop) demo orders for local UI testing."""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.order import Order

HIP_HOP_DEMO = [
    {
        "legacy_id": "demo-hip-hop-1",
        "school_program_name": "Metro Hip Hop Crew",
        "division": "varsity adv hip hop",
        "package_type": "DANCE MIX",
        "package": "DANCE MIX",
        "time_length_of_mix": "1:50-1:55",
        "music_affiliate": "Power Music Covers",
        "custom_voiceovers": "Yes - Traditional $25",
        "power_music_covers": "1) Beat Drop Remix\n2) Street Anthem",
        "song_list_suggestions": "",
    },
    {
        "legacy_id": "demo-hip-hop-2",
        "school_program_name": "Urban Rhythm Dance",
        "division": "sr coed hip hop",
        "package_type": "DANCE PLUS",
        "package": "DANCE PLUS",
        "time_length_of_mix": "2:00-2:05",
        "music_affiliate": "Unleash the Beats Covers",
        "custom_voiceovers": "No - None",
        "power_music_covers": "",
        "song_list_suggestions": "1) Unleash hip hop cut A\n2) Unleash hip hop cut B",
    },
    {
        "legacy_id": "demo-hip-hop-3",
        "school_program_name": "Pulse Dance Studio",
        "division": "open hip hop",
        "package_type": "CUSTOM POM",
        "package": "CUSTOM POM",
        "time_length_of_mix": "2:15-2:20",
        "music_affiliate": "Power Music Covers, Non compliant",
        "custom_voiceovers": "Yes - Both $100",
        "power_music_covers": "1) Power cover groove",
        "song_list_suggestions": "",
    },
]


def main() -> None:
    db = SessionLocal()
    created = 0
    try:
        for i, row in enumerate(HIP_HOP_DEMO, 1):
            legacy = row["legacy_id"]
            existing = db.query(Order).filter(Order.legacy_id == legacy).first()
            if existing:
                print(f"skip {legacy} (exists)")
                continue

            order = Order(
                legacy_id=legacy,
                form_type="school-all-star-dance",
                dance_form_subtype="hip-hop",
                category="Dance",
                school_program_name=row["school_program_name"],
                school_address=f"{700 + i} Hip Hop Blvd",
                city="Chicago",
                state_province="IL",
                zip_postal_code="60601",
                country="United States",
                division=row["division"],
                coach_name=f"Coach Riley {i}",
                coach_phone=f"555-070{i}",
                coach_email=f"riley.hh{i}@example.com",
                billing_person_name=f"HH Booster {i}",
                billing_person_email=f"booster.hh{i}@example.com",
                choreographer_name="N/A" if i == 2 else f"Choreo HH {i}",
                choreographer_email="N/A" if i == 2 else f"choreo.hh{i}@example.com",
                number_of_copies="1",
                package_type=row["package_type"],
                package=row["package"],
                time_length_of_mix=row["time_length_of_mix"],
                music_affiliate=row["music_affiliate"],
                power_music_covers=row["power_music_covers"] or None,
                song_list_suggestions=row["song_list_suggestions"] or None,
                routine_notes="Hard-hitting hits. Clean isolations and groove sections.",
                custom_voiceovers=row["custom_voiceovers"],
                voiceover_script='"Go Hawks" "Warner"' if "Yes" in row["custom_voiceovers"] else None,
                pronunciation_guidance="Warner like the studio name" if "Yes" in row["custom_voiceovers"] else None,
                coupon_code="HH2026" if i % 2 == 0 else None,
                customer_name=f"Coach Riley {i} ({row['school_program_name']})",
                contact_name=f"Coach Riley {i}",
                program_name=row["school_program_name"],
                editor_request="FA",
                requested_editor="First Available",
                requested_producer="FA",
                status="new",
                price=475.0 + (i * 30),
                price_compliance="compliant" if "Non compliant" not in row["music_affiliate"] else "nonCompliant",
                needs_attention=False,
                is_past_order=False,
            )
            db.add(order)
            created += 1
            print(f"created {legacy} — {row['school_program_name']}")

        db.commit()
        print(f"Done. Created {created} Hip Hop demo order(s).")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
