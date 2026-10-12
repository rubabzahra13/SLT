"""Insert Sports Entertainment demo orders for local UI testing."""
import os
import sys
from datetime import date, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.order import Order

SPORTS_ENT_DEMO = [
    {
        "legacy_id": "demo-se-1",
        "school_program_name": "Bay Area Blazers Basketball",
        "package_type": "QUARTER BREAK / TIMEOUT REMIXED",
        "package": "QUARTER BREAK / TIMEOUT REMIXED",
        "time_length_of_mix": "1:00",
        "is_rush_order": "No",
        "song_list_suggestions": '"Work It" Missy Elliot',
        "routine_notes": "High volume arena timeout mix.",
    },
    {
        "legacy_id": "demo-se-2",
        "school_program_name": "Midwest Ice Hockey Org",
        "package_type": "PRE-GAME / HALFTIME REMIXED",
        "package": "PRE-GAME / HALFTIME REMIXED",
        "time_length_of_mix": "2:00",
        "is_rush_order": "Yes",
        "song_list_suggestions": "Arena hype beats, organ remixes",
        "routine_notes": "Need under 7 days for season opener.",
    },
    {
        "legacy_id": "demo-se-3",
        "school_program_name": "Frontier Arena League",
        "package_type": "OTHER (mixes longer than 2:30)",
        "package": "OTHER (mixes longer than 2:30)",
        "time_length_of_mix": "3:30",
        "is_rush_order": "No",
        "song_list_suggestions": "Custom long-form entrance package",
        "routine_notes": "Manual pricing required — mix longer than 2:30.",
    },
]


def main() -> None:
    db = SessionLocal()
    created = 0
    try:
        for i, row in enumerate(SPORTS_ENT_DEMO, 1):
            legacy = row["legacy_id"]
            existing = db.query(Order).filter(Order.legacy_id == legacy).first()
            if existing:
                print(f"skip {legacy} (exists)")
                continue

            due = (date.today() + timedelta(days=14 + i)).isoformat()
            is_tbd = "OTHER" in row["package_type"]
            order = Order(
                legacy_id=legacy,
                form_type="sports-entertainment",
                category="Sports Entertainment",
                school_program_name=row["school_program_name"],
                program_name=row["school_program_name"],
                school_address=f"{1200 + i} Arena Way",
                billing_address=f"{1200 + i} Arena Way",
                city="Atlanta",
                state_province="GA",
                zip_postal_code="30301",
                country="United States",
                coach_name=f"Contact Avery {i}",
                coach_phone=f"555-120{i}",
                coach_email=f"avery.se{i}@example.com",
                billing_person_name=f"Accounts Payable {i}",
                billing_person_email=f"ap.se{i}@arena.com",
                package_type=row["package_type"],
                package=row["package"],
                time_length_of_mix=row["time_length_of_mix"],
                mix_end_date=due,
                is_rush_order=row["is_rush_order"],
                song_list_suggestions=row["song_list_suggestions"],
                routine_notes=row["routine_notes"],
                music_affiliate=None,
                customer_name=f"Contact Avery {i} ({row['school_program_name']})",
                contact_name=f"Contact Avery {i}",
                editor_request="FA",
                requested_editor="First Available",
                requested_producer="FA",
                status="new",
                price=0.0 if is_tbd else (150.0 + (i * 50)),
                price_compliance="needs_review" if is_tbd else "compliant",
                needs_attention=is_tbd,
                attention_reason="TBD / Manual Pricing Required" if is_tbd else None,
                is_past_order=False,
            )
            db.add(order)
            created += 1
            print(f"created {legacy} — {row['school_program_name']}")

        db.commit()
        print(f"Done. Created {created} Sports Entertainment demo order(s).")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
