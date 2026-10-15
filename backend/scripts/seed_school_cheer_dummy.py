"""Insert School Cheer (VIROC No) demo orders for local UI testing."""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.order import Order
from app.seed.ids import seed_uuid

SCHOOL_CHEER_DEMO = [
    {
        "legacy_id": "demo-school-cheer-1",
        "school_name": "Northside High",
        "mascot": "Mustangs",
        "division": "large varsity coed advanced",
        "team_coed_all_girl": "Coed",
        "team_colors": "blue, gold, and white",
        "split_or_no_split": "Split",
        "package_type": "Silver Package",
        "package": "SILVER 1:00",
        "time_length_of_mix": "1:00",
        "music_affiliate": (
            "Power Music & Unleash the Beats Covers "
            "(can not be used for a Titanium Package)"
        ),
        "choreographer_name": "N/A",
        "choreographer_email": "N/A",
    },
    {
        "legacy_id": "demo-school-cheer-2",
        "school_name": "Southland High",
        "mascot": "Spartans",
        "division": "Medium Varsity",
        "team_coed_all_girl": "All-Girl",
        "team_colors": "green and silver",
        "split_or_no_split": "No Split",
        "package_type": "Gold Package",
        "package": "GOLD 2:00",
        "time_length_of_mix": "2:00",
        "music_affiliate": "Power Music",
        "choreographer_name": "Alex Rivera",
        "choreographer_email": "alex.rivera@example.com",
    },
    {
        "legacy_id": "demo-school-cheer-3",
        "school_name": "Meadowbrook High",
        "mascot": "Colts",
        "division": "Small Varsity",
        "team_coed_all_girl": "Coed",
        "team_colors": "maroon & white",
        "split_or_no_split": "Split",
        "package_type": "Platinum Package",
        "package": "PLATINUM 2:30",
        "time_length_of_mix": "2:30",
        "music_affiliate": "Unleash the Beats",
        "choreographer_name": "N/A",
        "choreographer_email": "N/A",
    },
]


def main() -> None:
    db = SessionLocal()
    created = 0
    try:
        for i, row in enumerate(SCHOOL_CHEER_DEMO, 1):
            legacy = row["legacy_id"]
            order_pk = seed_uuid("order", legacy)
            existing = db.query(Order).filter(Order.id == order_pk).first()
            if existing:
                print(f"skip {legacy} (exists)")
                continue

            order = Order(
                id=order_pk,
                form_type="school-all-star-cheer",
                cheer_form_subtype="school-cheer-viroc-no",
                varsity_viroc_customer="No",
                school_gym_name=row["school_name"],
                school_gym_billing_address=f"{300 + i} Valley Blvd",
                city="Denver",
                state_province="CO",
                zip_postal_code="80201",
                country="United States",
                mascot=row["mascot"],
                division=row["division"],
                team_coed_all_girl=row["team_coed_all_girl"],
                colors=row["team_colors"],
                number_of_copies="1",
                coach_name=f"Coach Jennifer {i}",
                coach_phone=f"555-030{i}",
                coach_email=f"jennifer.cheer{i}@example.com",
                billing_person_name=f"School Admin {i}",
                billing_person_email=f"admin.school{i}@school.edu",
                choreographer_name=row["choreographer_name"],
                choreographer_email=row["choreographer_email"],
                package_type=row["package_type"],
                time_length_of_mix=row["time_length_of_mix"],
                split_or_no_split=row["split_or_no_split"],
                music_affiliate=row["music_affiliate"],
                sending_eight_count_sheets="Yes",
                song_list_suggestions=(
                    "Only select songs available at either "
                    "www.powermusictrax.com OR www.unleashthebeats.com."
                ),
                routine_notes="Team phrases and theme notes for the mix.",
                coupon_code=None,
                how_did_you_find_out="Return Customer",
                customer_name=f"Coach Jennifer {i} ({row['school_name']})",
                contact_name=f"Coach Jennifer {i}",
                package=row["package"],
                editor_initials="FA",
                requested_editor="First Available",
                status="new",
                price=500.0 + (i * 12),
                price_compliance="compliant",
                needs_attention=False,
                is_past_order=False,
            )
            db.add(order)
            created += 1
            print(f"created {legacy} — {row['school_name']}")

        db.commit()
        print(f"Done. Created {created} School Cheer demo order(s).")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
