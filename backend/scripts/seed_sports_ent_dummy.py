"""Insert Sports Entertainment demo orders for local UI testing."""
import os
import sys
from datetime import date, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.order import Order
from app.seed.ids import seed_uuid

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
        "routine_notes": "Manual pricing required: mix longer than 2:30.",
    },
    # Extra Magento coverage so each PACKAGE TYPE has a second demo row.
    {
        "legacy_id": "demo-se-4",
        "school_program_name": "Coastal Tip-Off Crew",
        "package_type": "QUARTER BREAK / TIMEOUT REMIXED",
        "package": "QUARTER BREAK / TIMEOUT REMIXED",
        "time_length_of_mix": "0:45",
        "is_rush_order": "No",
        "song_list_suggestions": "Timeout stinger + crowd clap track",
        "routine_notes": "Keep under :50 for TV timeout.",
    },
    {
        "legacy_id": "demo-se-5",
        "school_program_name": "Summit Stadium Entertainment",
        "package_type": "PRE-GAME / HALFTIME REMIXED",
        "package": "PRE-GAME / HALFTIME REMIXED",
        "time_length_of_mix": "2:15",
        "is_rush_order": "No",
        "song_list_suggestions": "Stadium walkout + halftime remix bed",
        "routine_notes": "Prefers organ hits at section changes.",
    },
    {
        "legacy_id": "demo-se-6",
        "school_program_name": "Pacific Pro Showcase",
        "package_type": "OTHER (mixes longer than 2:30)",
        "package": "OTHER (mixes longer than 2:30)",
        "time_length_of_mix": "4:00",
        "is_rush_order": "Yes",
        "song_list_suggestions": "Specify full song list in notes: custom length show open.",
        "routine_notes": "Other package: quote via email. Need under 7 days.",
    },
    # Normal Magento form (not manual): OTHER package + Rush Yes.
    {
        "legacy_id": "demo-se-form-other-rush",
        "school_program_name": "Metro Arena Sports Entertainment",
        "package_type": "OTHER - SPECIFY IN NOTES SECTION OF THE ORDER FORM",
        "package": "OTHER - SPECIFY IN NOTES SECTION OF THE ORDER FORM",
        "time_length_of_mix": "3:15",
        "is_rush_order": "Yes",
        "client_requested_rush_order": "Yes",
        "song_list_suggestions": (
            "1) Walk-out anthem remix\n"
            "2) Goal horn bed with crowd swell\n"
            "3) Timeout stinger pack"
        ),
        "routine_notes": (
            "OTHER package: specify in notes: need a custom 3:15 "
            "arena entertainment suite (walk-out + timeout + goal cue). "
            "Quote via email. Rush under 7 days."
        ),
        "is_manual_entry": False,
    },
]


def main() -> None:
    db = SessionLocal()
    created = 0
    try:
        for i, row in enumerate(SPORTS_ENT_DEMO, 1):
            legacy = row["legacy_id"]
            order_pk = seed_uuid("order", legacy)
            existing = db.query(Order).filter(Order.id == order_pk).first()
            if existing:
                print(f"skip {legacy} (exists)")
                continue

            due = (date.today() + timedelta(days=14 + i)).isoformat()
            is_tbd = "OTHER" in row["package_type"].upper()
            rush = row["is_rush_order"]
            client_rush = row.get("client_requested_rush_order", rush)
            order = Order(
                id=order_pk,
                form_type="sports-entertainment",
                school_gym_name=row["school_program_name"],
                school_gym_billing_address=f"{1200 + i} Arena Way",
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
                client_requested_mix_due_date=due,
                is_rush_order=rush,
                client_requested_rush_order=client_rush,
                song_list_suggestions=row["song_list_suggestions"],
                routine_notes=row["routine_notes"],
                music_affiliate=None,
                customer_name=f"Contact Avery {i} ({row['school_program_name']})",
                contact_name=f"Contact Avery {i}",
                editor_initials="FA",
                requested_editor="First Available",
                status="new",
                price=0.0 if is_tbd else (150.0 + (i * 50)),
                price_compliance="needs_review" if is_tbd else "compliant",
                needs_attention=is_tbd,
                attention_reason="TBD / Manual Pricing Required" if is_tbd else None,
                is_past_order=False,
                # Default Magento form row (not admin Add Order).
                is_manual_entry=bool(row.get("is_manual_entry", False)),
            )
            db.add(order)
            created += 1
            print(f"created {legacy}: {row['school_program_name']}")

        db.commit()
        print(f"Done. Created {created} Sports Entertainment demo order(s).")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
