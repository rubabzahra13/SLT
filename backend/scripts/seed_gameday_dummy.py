"""Insert Gameday (school-all-star-dance / gameday) demo orders for local UI testing."""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.order import Order
from app.seed.ids import seed_uuid

GAMEDAY_DEMO = [
    {
        "legacy_id": "demo-gameday-1",
        "school_program_name": "Central High Gameday",
        "style": "Pom",
        "package_type": "PERFORMANCE MIX",
        "package": "PERFORMANCE MIX",
        "time_length_of_mix": "0:55",
        "music_affiliate": "Power Music Covers",
        "custom_voiceovers": "Yes ($25)",
        "power_music_covers": "1) Fight Song Cut",
        "song_list_suggestions": "",
    },
    {
        "legacy_id": "demo-gameday-2",
        "school_program_name": "Riverside Academy Dance",
        "style": "Hip Hop",
        "package_type": "PERFORMANCE PLUS",
        "package": "PERFORMANCE PLUS",
        "time_length_of_mix": "1:00",
        "music_affiliate": "Unleash the Beats Covers",
        "custom_voiceovers": "No - None",
        "power_music_covers": "",
        "song_list_suggestions": "1) Sideline hype track",
    },
    {
        "legacy_id": "demo-gameday-3",
        "school_program_name": "Westfield Gameday Squad",
        "style": "Jazz",
        "package_type": "PERFORMANCE EXTREME",
        "package": "PERFORMANCE EXTREME",
        "time_length_of_mix": "0:50",
        "music_affiliate": "Power Music Covers, Non compliant",
        "custom_voiceovers": "Yes ($25)",
        "power_music_covers": "1) Power gameday hit",
        "song_list_suggestions": "",
    },
]


def main() -> None:
    db = SessionLocal()
    created = 0
    try:
        for i, row in enumerate(GAMEDAY_DEMO, 1):
            legacy = row["legacy_id"]
            order_pk = seed_uuid("order", legacy)
            existing = db.query(Order).filter(Order.id == order_pk).first()
            if existing:
                print(f"skip {legacy} (exists)")
                continue

            order = Order(
                id=order_pk,
                form_type="school-all-star-dance",
                dance_form_subtype="gameday",
                school_gym_name=row["school_program_name"],
                school_gym_billing_address=f"{900 + i} Stadium Drive",
                city="Dallas",
                state_province="TX",
                zip_postal_code="75201",
                country="United States",
                style=row["style"],
                coach_name=f"Coach Casey {i}",
                coach_phone=f"555-090{i}",
                coach_email=f"casey.gd{i}@example.com",
                billing_person_name=f"Gameday Booster {i}",
                billing_person_email=f"booster.gd{i}@example.com",
                choreographer_name="N/A",
                choreographer_email="N/A",
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
                routine_notes="Sideline energy. Keep under 1:00. Crowd-call moments.",
                custom_voiceovers=row["custom_voiceovers"],
                voiceover_script='Go Hawks!, This is Capitan' if "Yes" in row["custom_voiceovers"] else None,
                pronunciation_guidance="Capitan like Captain" if "Yes" in row["custom_voiceovers"] else None,
                coupon_code="GAME2026" if i % 2 == 0 else None,
                customer_name=f"Coach Casey {i} ({row['school_program_name']})",
                contact_name=f"Coach Casey {i}",
                editor_initials="FA",
                requested_editor="First Available",
                status="new",
                price=100.0 + (i * 25),
                price_compliance="compliant" if "Non compliant" not in row["music_affiliate"] else "nonCompliant",
                needs_attention=False,
                is_past_order=False,
            )
            db.add(order)
            created += 1
            print(f"created {legacy} — {row['school_program_name']}")

        db.commit()
        print(f"Done. Created {created} Gameday demo order(s).")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
