"""Insert VIROC (school-cheer-viroc-yes) demos: one per Magento SoftSelect PACKAGE TYPE.

Magento SoftSelect (VIROC):
  Silver Package → Gold Package → Platinum Package → Titanium Package
  → Rally Mix (without 8 count sheets)
Length of Mix SoftSelect: 1:00 / 1:30 / 1:45 / 2:15 / 2:30 (no 2:00).
"""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.order import Order
from app.seed.ids import seed_uuid

VIROC_DEMO = [
    {
        "legacy_id": "demo-viroc-1",
        "school_name": "Lincoln High School",
        "mascot": "Lions",
        "division": "large varsity coed advanced",
        "team_coed_all_girl": "Coed",
        "team_colors": "blue, gold, and white",
        "split_or_no_split": "Split",
        "package_type": "SILVER",
        "package": "SILVER 1:00",
        "time_length_of_mix": "1:00",
        "music_affiliate": "Power Music",
        "how_did_you_find_out": "Return Customer",
        "price": 450.0,
    },
    {
        "legacy_id": "demo-viroc-2",
        "school_name": "Oakridge Academy",
        "mascot": "Eagles",
        "division": "Medium Varsity",
        "team_coed_all_girl": "All-Girl",
        "team_colors": "navy and silver",
        "split_or_no_split": "No Split",
        "package_type": "GOLD",
        "package": "GOLD 1:30",
        "time_length_of_mix": "1:30",
        "music_affiliate": "Unleash the Beats",
        "how_did_you_find_out": "Varsity Representative",
        "price": 700.0,
    },
    {
        "legacy_id": "demo-viroc-3",
        "school_name": "Westlake High",
        "mascot": "Wolverines",
        "division": "Super Varsity",
        "team_coed_all_girl": "Coed",
        "team_colors": "black & gold",
        "split_or_no_split": "Split",
        "package_type": "PLATINUM",
        "package": "PLATINUM 1:45",
        "time_length_of_mix": "1:45",
        "music_affiliate": "Power Music + Unleash the Beats",
        "how_did_you_find_out": "Word of Mouth",
        "price": 1200.0,
    },
    {
        "legacy_id": "demo-viroc-4",
        "school_name": "Valley View High",
        "mascot": "Panthers",
        "division": "Small Varsity",
        "team_coed_all_girl": "All-Girl",
        "team_colors": "purple, white",
        "split_or_no_split": "No Split",
        "package_type": "TITANIUM",
        "package": "TITANIUM 2:15",
        "time_length_of_mix": "2:15",
        "music_affiliate": "100% Original Custom Music (Titanium Package Only)",
        "how_did_you_find_out": "Instagram",
        "price": 2800.0,
    },
    {
        "legacy_id": "demo-viroc-5",
        "school_name": "Heritage High",
        "mascot": "Patriots",
        "division": "Large Varsity",
        "team_coed_all_girl": "Coed",
        "team_colors": "red, white, and blue",
        "split_or_no_split": "Split",
        "package_type": "RALLY MIX",
        "package": "RALLY MIX",
        "time_length_of_mix": "2:30",
        "sending_eight_count_sheets": "Yes",
        "music_affiliate": (
            "Power Music & Unleash the Beats Covers "
            "(can not be used for a Titanium Package)"
        ),
        "how_did_you_find_out": "Return Customer",
        "price": 350.0,
    },
]


def _apply_demo_fields(order: Order, row: dict, i: int) -> None:
    order.form_type = "school-all-star-cheer"
    order.cheer_form_subtype = "school-cheer-viroc-yes"
    order.varsity_viroc_customer = "Yes"
    order.school_gym_name = row["school_name"]
    order.school_gym_billing_address = f"{200 + i} School Road"
    order.city = "Austin"
    order.state_province = "TX"
    order.zip_postal_code = "78701"
    order.country = "United States"
    order.mascot = row["mascot"]
    order.division = row["division"]
    order.team_coed_all_girl = row["team_coed_all_girl"]
    order.colors = row["team_colors"]
    order.number_of_copies = "1"
    order.coach_name = f"Coach Mark {i}"
    order.coach_phone = f"555-020{i}"
    order.coach_email = f"mark.viroc{i}@example.com"
    order.billing_person_name = f"School Admin {i}"
    order.billing_person_email = f"admin.viroc{i}@school.edu"
    order.choreographer_name = f"Choreographer VIROC {i}"
    order.choreographer_email = f"viroc.choreo{i}@varsity.com"
    order.package_type = row["package_type"]
    order.time_length_of_mix = row["time_length_of_mix"]
    order.split_or_no_split = row["split_or_no_split"]
    order.music_affiliate = row["music_affiliate"]
    order.music_affiliate_selections = row.get("music_affiliate_selections")
    order.affiliate_flag_status = row.get("affiliate_flag_status")
    order.sending_eight_count_sheets = row.get(
        "sending_eight_count_sheets", "Yes"
    )
    order.song_list_suggestions = "Top 40 Remix, Fight Song Integration, Hype Beat"
    order.routine_notes = "VIROC choreography notes. Clean transitions required."
    order.coupon_code = "VIROC2026" if i % 2 == 0 else None
    order.how_did_you_find_out = row["how_did_you_find_out"]
    order.customer_name = f"Coach Mark {i} ({row['school_name']})"
    order.contact_name = f"Coach Mark {i}"
    order.package = row["package"]
    order.editor_initials = "FA"
    order.requested_editor = "First Available"
    order.status = "new"
    order.price = float(row["price"])
    order.price_compliance = "compliant"
    order.needs_attention = bool(row.get("needs_attention", False))
    order.attention_reason = row.get("attention_reason")
    order.is_past_order = False


def main() -> None:
    db = SessionLocal()
    created = 0
    updated = 0
    try:
        for i, row in enumerate(VIROC_DEMO, 1):
            legacy = row["legacy_id"]
            order_pk = seed_uuid("order", legacy)
            existing = db.query(Order).filter(Order.id == order_pk).first()
            if existing:
                _apply_demo_fields(existing, row, i)
                updated += 1
                print(f"updated {legacy}: {row['school_name']} / {row['package']}")
                continue

            order = Order(id=order_pk)
            _apply_demo_fields(order, row, i)
            db.add(order)
            created += 1
            print(f"created {legacy}: {row['school_name']} / {row['package']}")

        db.commit()
        print(f"Done. Created {created}, updated {updated} VIROC Magento SoftSelect demo(s).")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
