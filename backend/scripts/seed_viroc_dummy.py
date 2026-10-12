"""Insert a few VIROC (school-cheer-viroc-yes) demo orders for local UI testing."""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.order import Order

VIROC_DEMO = [
    {
        "legacy_id": "demo-viroc-1",
        "school_name": "Lincoln High School",
        "mascot": "Lions",
        "division": "large varsity coed advanced",
        "team_coed_all_girl": "Coed",
        "team_colors": "blue, gold, and white",
        "split_or_no_split": "Split",
        "package_type": "Silver Package",
        "package": "SILVER 1:00",
        "time_length_of_mix": "1:00",
        "music_affiliate": "Power Music",
        "how_did_you_find_out": "Return Customer",
    },
    {
        "legacy_id": "demo-viroc-2",
        "school_name": "Oakridge Academy",
        "mascot": "Eagles",
        "division": "Medium Varsity",
        "team_coed_all_girl": "All-Girl",
        "team_colors": "navy and silver",
        "split_or_no_split": "No Split",
        "package_type": "Gold Package",
        "package": "GOLD 2:00",
        "time_length_of_mix": "2:00",
        "music_affiliate": "Unleash the Beats",
        "how_did_you_find_out": "Varsity Representative",
    },
    {
        "legacy_id": "demo-viroc-3",
        "school_name": "Westlake High",
        "mascot": "Wolverines",
        "division": "Super Varsity",
        "team_coed_all_girl": "Coed",
        "team_colors": "black & gold",
        "split_or_no_split": "Split",
        "package_type": "Platinum Package",
        "package": "PLATINUM 2:00",
        "time_length_of_mix": "2:00",
        "music_affiliate": "Power Music + Unleash the Beats",
        "how_did_you_find_out": "Word of Mouth",
    },
    {
        "legacy_id": "demo-viroc-4",
        "school_name": "Valley View High",
        "mascot": "Panthers",
        "division": "Small Varsity",
        "team_coed_all_girl": "All-Girl",
        "team_colors": "purple, white",
        "split_or_no_split": "No Split",
        "package_type": "Silver Package",
        "package": "SILVER 2:30",
        "time_length_of_mix": "2:30",
        # Multi-select for Flagged page demo
        "music_affiliate": "Power Music, Library Music",
        "music_affiliate_selections": "Power Music, Library Music",
        "affiliate_flag_status": "open",
        "how_did_you_find_out": "Instagram",
        "needs_attention": True,
        "attention_reason": "Multiple music affiliates selected",
    },
    {
        "legacy_id": "demo-viroc-5",
        "school_name": "Heritage High",
        "mascot": "Patriots",
        "division": "Large Varsity",
        "team_coed_all_girl": "Coed",
        "team_colors": "red, white, and blue",
        "split_or_no_split": "Split",
        "package_type": "Gold Package",
        "package": "GOLD 1:30",
        "time_length_of_mix": "1:30",
        "music_affiliate": (
            "Power Music & Unleash the Beats Covers "
            "(can not be used for a Titanium Package)"
        ),
        "how_did_you_find_out": "Return Customer",
    },
]


def main() -> None:
    db = SessionLocal()
    created = 0
    try:
        for i, row in enumerate(VIROC_DEMO, 1):
            legacy = row["legacy_id"]
            existing = db.query(Order).filter(Order.legacy_id == legacy).first()
            if existing:
                print(f"skip {legacy} (exists)")
                continue

            order = Order(
                legacy_id=legacy,
                form_type="school-all-star-cheer",
                cheer_form_subtype="school-cheer-viroc-yes",
                varsity_viroc_customer="Yes",
                category="Cheer",
                school_name=row["school_name"],
                school_billing_address=f"{200 + i} School Road",
                city="Austin",
                state_province="TX",
                zip_postal_code="78701",
                country="United States",
                mascot=row["mascot"],
                division=row["division"],
                team_coed_all_girl=row["team_coed_all_girl"],
                team_colors=row["team_colors"],
                number_of_copies="1",
                coach_name=f"Coach Mark {i}",
                coach_phone=f"555-020{i}",
                coach_email=f"mark.viroc{i}@example.com",
                billing_person_name=f"School Admin {i}",
                billing_person_email=f"admin.viroc{i}@school.edu",
                viroc_choreographer_name=f"Choreographer VIROC {i}",
                viroc_choreographer_email=f"viroc.choreo{i}@varsity.com",
                package_type=row["package_type"],
                time_length_of_mix=row["time_length_of_mix"],
                split_or_no_split=row["split_or_no_split"],
                music_affiliate=row["music_affiliate"],
                music_affiliate_selections=row.get("music_affiliate_selections"),
                affiliate_flag_status=row.get("affiliate_flag_status"),
                sending_eight_count_sheets="Yes",
                song_list_suggestions="Top 40 Remix, Fight Song Integration, Hype Beat",
                routine_notes="VIROC choreography notes. Clean transitions required.",
                coupon_code="VIROC2026" if i % 2 == 0 else None,
                how_did_you_find_out=row["how_did_you_find_out"],
                customer_name=f"Coach Mark {i} ({row['school_name']})",
                contact_name=f"Coach Mark {i}",
                program_name=row["school_name"],
                package=row["package"],
                editor_request="FA",
                requested_editor="First Available",
                requested_producer="FA",
                status="new",
                price=600.0 + (i * 15),
                price_compliance="compliant",
                needs_attention=bool(row.get("needs_attention", False)),
                attention_reason=row.get("attention_reason"),
                is_past_order=False,
            )
            db.add(order)
            created += 1
            print(f"created {legacy} — {row['school_name']}")

        db.commit()
        print(f"Done. Created {created} VIROC demo order(s).")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
