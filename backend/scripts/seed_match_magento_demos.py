"""Insert unmatched Magento forms that identity-match existing manual orders.

Used to exercise Match Orders suggestions (admin Match flow). Idempotent.
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.order import Order
from app.seed.ids import seed_uuid

# Magento forms named to score ≥0.9 against current unmatched manuals,
# plus a couple of polished Cheer pairs for the default Match tab.
MAGENTO_DEMOS = [
    # Default Cheer / All-Star tab: matches manual "l"
    {
        "legacy_id": "demo-match-magento-cheer-l",
        "form_type": "school-all-star-cheer",
        "cheer_form_subtype": "all-star-cheer",
        "school_gym_name": "l",
        "package": "Platinum 2:30",
        "package_type": "Platinum",
        "time_length_of_mix": "2:30",
        "contact": "Coach Magento L",
        "price": 1850.0,
    },
    {
        "legacy_id": "demo-match-magento-cheer-thunder",
        "form_type": "school-all-star-cheer",
        "cheer_form_subtype": "all-star-cheer",
        "school_gym_name": "Thunder Elite Cheer",
        "package": "Gold 2:00",
        "package_type": "Gold",
        "time_length_of_mix": "2:00",
        "contact": "Coach Morgan Magento",
        "price": 1650.0,
        # Also ensure a matching manual exists
        "ensure_manual": {
            "legacy_id": "demo-match-manual-cheer-thunder",
            "school_gym_name": "Thunder Elite Cheer",
            "contact": "Coach Alex Manual",
            "package": "Gold 2:00",
            "package_type": "Gold",
            "time_length_of_mix": "2:00",
            "price": 0.0,
        },
    },
    {
        "legacy_id": "demo-match-magento-cheer-riverside",
        "form_type": "school-all-star-cheer",
        "cheer_form_subtype": "all-star-cheer",
        "school_gym_name": "Riverside All-Star",
        "package": "Silver 1:30",
        "package_type": "Silver",
        "time_length_of_mix": "1:30",
        "contact": "Coach Jamie Magento",
        "price": 1200.0,
        "ensure_manual": {
            "legacy_id": "demo-match-manual-cheer-riverside",
            "school_gym_name": "Riverside All Stars",
            "contact": "Coach Pat Manual",
            "package": "Silver 1:30",
            "package_type": "Silver",
            "time_length_of_mix": "1:30",
            "price": 0.0,
        },
    },
    # Sports Entertainment: matches manual "x"
    {
        "legacy_id": "demo-match-magento-se-x",
        "form_type": "sports-entertainment",
        "school_gym_name": "x",
        "package": "PRE-GAME / HALFTIME REMIXED",
        "package_type": "PRE-GAME / HALFTIME REMIXED",
        "time_length_of_mix": "1:00",
        "contact": "Contact Magento X",
        "price": 900.0,
    },
    # Marching Band: matches manual "bb"
    {
        "legacy_id": "demo-match-magento-mb-bb",
        "form_type": "marching-band",
        "school_gym_name": "bb",
        "package": "BAND CHANT",
        "package_type": "BAND CHANT",
        "contact": "Director Magento BB",
        "price": 750.0,
    },
    # Dance subtypes matching short manuals
    {
        "legacy_id": "demo-match-magento-dance-pom-m",
        "form_type": "school-all-star-dance",
        "dance_form_subtype": "pom",
        "school_gym_name": "m",
        "package": "Custom POM 2:15",
        "package_type": "Custom POM",
        "time_length_of_mix": "2:15",
        "contact": "Coach Magento M",
        "price": 1400.0,
    },
    {
        "legacy_id": "demo-match-magento-dance-pom-dance1",
        "form_type": "school-all-star-dance",
        "dance_form_subtype": "pom",
        "school_gym_name": "POM DANCE 1",
        "package": "Custom POM 2:00",
        "package_type": "Custom POM",
        "time_length_of_mix": "2:00",
        "contact": "Coach Magento POM",
        "price": 1400.0,
    },
    {
        "legacy_id": "demo-match-magento-dance-jazz-k",
        "form_type": "school-all-star-dance",
        "dance_form_subtype": "jazz-kick",
        "school_gym_name": "k",
        "package": "Custom Jazz/Kick",
        "package_type": "Custom Jazz/Kick",
        "time_length_of_mix": "2:00",
        "contact": "Coach Magento K",
        "price": 1400.0,
    },
    {
        "legacy_id": "demo-match-magento-dance-hiphop-n",
        "form_type": "school-all-star-dance",
        "dance_form_subtype": "hip-hop",
        "school_gym_name": "n",
        "package": "Custom Hip Hop",
        "package_type": "Custom Hip Hop",
        "time_length_of_mix": "2:00",
        "contact": "Coach Magento N",
        "price": 1400.0,
    },
    {
        "legacy_id": "demo-match-magento-dance-gameday-m",
        "form_type": "school-all-star-dance",
        "dance_form_subtype": "gameday",
        "school_gym_name": "m",
        "package": "Custom Game Day",
        "package_type": "Custom Game Day",
        "time_length_of_mix": "1:30",
        "contact": "Coach Magento GD",
        "price": 1100.0,
    },
    {
        "legacy_id": "demo-match-magento-dance-tpv-s",
        "form_type": "school-all-star-dance",
        "dance_form_subtype": "team-performance-variety",
        "school_gym_name": "s",
        "package": "Custom Team Performance",
        "package_type": "Custom Team Performance",
        "time_length_of_mix": "2:30",
        "contact": "Coach Magento S",
        "price": 1500.0,
    },
    # School Anthem: matches manuals "mm" and "School Anthem 1"
    {
        "legacy_id": "demo-match-magento-anthem-mm",
        "form_type": "school-anthem",
        "school_gym_name": "mm",
        "package": "SCHOOL ANTHEMS",
        "package_type": "SCHOOL ANTHEMS",
        "contact": "Director Magento MM",
        "price": 1250.0,
    },
    {
        "legacy_id": "demo-match-magento-anthem-1",
        "form_type": "school-anthem",
        "school_gym_name": "School Anthem 1",
        "package": "SCHOOL ANTHEMS",
        "package_type": "SCHOOL ANTHEMS",
        "contact": "Director Magento Anthem",
        "price": 1250.0,
    },
]


def _upsert_manual(db, form_type: str, cheer_sub: str | None, dance_sub: str | None, row: dict) -> None:
    oid = seed_uuid("order", row["legacy_id"])
    existing = db.query(Order).filter(Order.id == oid).first()
    if existing:
        existing.is_manual_entry = True
        existing.merged_form_order_id = None
        existing.merged_into_manual_order_id = None
        existing.manual_overlap_snapshot = None
        existing.suppress_manual_form_merge = False
        existing.is_past_order = False
        existing.status = "new"
        existing.school_gym_name = row["school_gym_name"]
        print(f"manual keep {row['legacy_id']}: {row['school_gym_name']}")
        return

    db.add(
        Order(
            id=oid,
            form_type=form_type,
            cheer_form_subtype=cheer_sub,
            dance_form_subtype=dance_sub,
            school_gym_name=row["school_gym_name"],
            coach_name=row["contact"],
            contact_name=row["contact"],
            customer_name=f"{row['contact']} ({row['school_gym_name']})",
            coach_email=f"{row['legacy_id']}@example.com",
            package=row["package"],
            package_type=row["package_type"],
            time_length_of_mix=row.get("time_length_of_mix"),
            editor_initials="FA",
            requested_editor="First Available",
            status="new",
            order_status="Complete",
            price=float(row["price"]),
            is_manual_entry=True,
            needs_attention=True,
            is_past_order=False,
        )
    )
    print(f"manual create {row['legacy_id']}: {row['school_gym_name']}")


def main() -> None:
    db = SessionLocal()
    created = 0
    try:
        for row in MAGENTO_DEMOS:
            ensure = row.get("ensure_manual")
            if ensure:
                _upsert_manual(
                    db,
                    row["form_type"],
                    row.get("cheer_form_subtype"),
                    row.get("dance_form_subtype"),
                    ensure,
                )

            oid = seed_uuid("order", row["legacy_id"])
            existing = db.query(Order).filter(Order.id == oid).first()
            if existing:
                existing.is_manual_entry = False
                existing.merged_form_order_id = None
                existing.merged_into_manual_order_id = None
                existing.manual_overlap_snapshot = None
                existing.suppress_manual_form_merge = False
                existing.is_past_order = False
                existing.status = "new"
                existing.school_gym_name = row["school_gym_name"]
                existing.form_type = row["form_type"]
                existing.cheer_form_subtype = row.get("cheer_form_subtype")
                existing.dance_form_subtype = row.get("dance_form_subtype")
                print(f"magento keep {row['legacy_id']}: {row['school_gym_name']}")
                continue

            db.add(
                Order(
                    id=oid,
                    form_type=row["form_type"],
                    cheer_form_subtype=row.get("cheer_form_subtype"),
                    dance_form_subtype=row.get("dance_form_subtype"),
                    school_gym_name=row["school_gym_name"],
                    coach_name=row["contact"],
                    contact_name=row["contact"],
                    customer_name=f"{row['contact']} ({row['school_gym_name']})",
                    coach_email=f"{row['legacy_id']}@example.com",
                    coach_phone="555-0100",
                    package=row["package"],
                    package_type=row["package_type"],
                    time_length_of_mix=row.get("time_length_of_mix"),
                    song_list_suggestions="Song A, Song B",
                    sending_eight_count_sheets="Yes",
                    have_songs="HAVE SONGS",
                    city="Austin",
                    state_province="TX",
                    country="United States",
                    editor_initials="FA",
                    requested_editor="First Available",
                    status="new",
                    order_status="Complete",
                    price=float(row["price"]),
                    is_manual_entry=False,
                    needs_attention=False,
                    is_past_order=False,
                )
            )
            created += 1
            print(f"magento create {row['legacy_id']}: {row['school_gym_name']}")

        db.commit()
        print(f"Done. Created {created} Magento match demo(s). Refresh Match Orders.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
