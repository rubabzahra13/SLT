"""Insert Jazz/Kick demo orders for local UI testing."""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.order import Order
from app.seed.ids import seed_uuid

JAZZ_KICK_DEMO = [
    {
        "legacy_id": "demo-jazz-kick-1",
        "school_program_name": "Summit Jazz Ensemble",
        "division": "small senior advanced pom",
        "style": "Jazz",
        "package_type": "JAZZ/KICK MIX",
        "package": "JAZZ/KICK MIX",
        "time_length_of_mix": "1:50-1:55",
        "licensing_required": "Yes",
        "music_affiliate": "Power Music Covers",
        "custom_voiceovers": "Yes ($25)",
        "power_music_covers": "1) Jazz opening\n2) Kick finish",
        "song_list_suggestions": "",
    },
    {
        "legacy_id": "demo-jazz-kick-2",
        "school_program_name": "Lakeview Kick Line",
        "division": "large junior kick",
        "style": "Kick",
        "package_type": "JAZZ SIMPLE CUT",
        "package": "JAZZ SIMPLE CUT",
        "time_length_of_mix": "1:30-1:35",
        "licensing_required": "No",
        "music_affiliate": "Unleash the Beats Covers",
        "custom_voiceovers": "No - None",
        "power_music_covers": "",
        "song_list_suggestions": "1) Unleash kick groove",
    },
    {
        "legacy_id": "demo-jazz-kick-3",
        "school_program_name": "Heritage Jazz/Kick",
        "division": "open jazz",
        "style": "Jazz",
        "package_type": "JAZZ/KICK MIX",
        "package": "JAZZ/KICK MIX",
        "time_length_of_mix": "2:00-2:05",
        "licensing_required": "Yes",
        "music_affiliate": "Power Music Covers, Non compliant",
        "custom_voiceovers": "Yes ($25)",
        "power_music_covers": "1) Power jazz cut",
        "song_list_suggestions": "",
    },
]


def main() -> None:
    db = SessionLocal()
    created = 0
    try:
        for i, row in enumerate(JAZZ_KICK_DEMO, 1):
            legacy = row["legacy_id"]
            order_pk = seed_uuid("order", legacy)
            existing = db.query(Order).filter(Order.id == order_pk).first()
            if existing:
                print(f"skip {legacy} (exists)")
                continue

            order = Order(
                id=order_pk,
                form_type="school-all-star-dance",
                dance_form_subtype="jazz-kick",
                school_gym_name=row["school_program_name"],
                school_gym_billing_address=f"{1000 + i} Jazz Lane",
                city="Denver",
                state_province="CO",
                zip_postal_code="80202",
                country="United States",
                division=row["division"],
                style=row["style"],
                licensing_required=row["licensing_required"],
                coach_name=f"Coach Quinn {i}",
                coach_phone=f"555-100{i}",
                coach_email=f"quinn.jk{i}@example.com",
                billing_person_name=f"JK Booster {i}",
                billing_person_email=f"booster.jk{i}@example.com",
                choreographer_name="N/A" if i == 2 else f"Choreo JK {i}",
                choreographer_email="N/A" if i == 2 else f"choreo.jk{i}@example.com",
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
                routine_notes="Clean turns and kick lines. Strong jazz accents.",
                custom_voiceovers=row["custom_voiceovers"],
                voiceover_script="Go Hawks!" if "Yes" in row["custom_voiceovers"] else None,
                pronunciation_guidance="Hawks like baseball Hawks" if "Yes" in row["custom_voiceovers"] else None,
                coupon_code="JK2026" if i % 2 == 0 else None,
                customer_name=f"Coach Quinn {i} ({row['school_program_name']})",
                contact_name=f"Coach Quinn {i}",
                editor_initials="FA",
                requested_editor="First Available",
                status="new",
                price=200.0 if "MIX" in row["package_type"] else 100.0,
                price_compliance="compliant" if "Non compliant" not in row["music_affiliate"] else "nonCompliant",
                needs_attention=False,
                is_past_order=False,
            )
            db.add(order)
            created += 1
            print(f"created {legacy} — {row['school_program_name']}")

        db.commit()
        print(f"Done. Created {created} Jazz/Kick demo order(s).")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
