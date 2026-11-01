"""Seed one Flagged Orders demo per Cheer/Dance category that can raise an affiliate flag.

Program / gym / school name: QA FLAG NABS.

Magento multi-select arrives as comma-space joined options on music_affiliate.
These rows land on Flagged Orders with affiliate_flag_status=open and price=0
(no automatic pricing until Resolve picks one affiliate).

Categories covered (forms with a Music Affiliate SoftSelect):
  Cheer: All Star, VIROC, School Cheer
  Dance: Pom, Hip Hop, Team Performance & Variety, Gameday, Jazz/Kick

Youth Rec / Marching Band / Sports Entertainment / School Anthem are skipped —
they have no music affiliate field and cannot raise this flag.
"""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.order import Order
from app.seed.ids import seed_uuid

PROGRAM = "QA FLAG NABS"

CHEER_NON_TITANIUM = (
    "Power Music & Unleash the Beats Covers "
    "(can not be used for a Titanium Package)"
)
CHEER_TITANIUM = "100% original custom music (titanium package only)"

# All-Star Cheer Magento SoftSelect (4 options).
ALL_STAR_MULTI = ", ".join(
    [
        CHEER_NON_TITANIUM,
        "Songs for Cheer",
        CHEER_TITANIUM,
        "Non compliant",
    ]
)

# School Cheer / VIROC Magento SoftSelect (3 options; no Songs for Cheer).
SCHOOL_VIROC_MULTI = ", ".join(
    [
        CHEER_NON_TITANIUM,
        CHEER_TITANIUM,
        "Non compliant",
    ]
)

# Dance Magento SoftSelect — Power+Unleash alone is allowed; add Non compliant to flag.
DANCE_MULTI = "Power Music Covers, Unleash the Beats Covers, Non compliant"

QA_FLAG_NABS_DEMOS = [
    # --- Cheer ---
    {
        "legacy_id": "qa-flag-nabs-all-star",
        "label": "All Star Cheer",
        "form_type": "school-all-star-cheer",
        "cheer_form_subtype": "all-star-cheer",
        "package_type": "GOLD 2:00",
        "package": "GOLD 2:00",
        "time_length_of_mix": "2:00",
        "music_affiliate": ALL_STAR_MULTI,
        "team_name": "Flag Open",
        "team_coed_all_girl": "All Girl",
        "colors": "Orange / Black",
        "division": "Level 5",
        "sending_eight_count_sheets": "Yes",
    },
    {
        "legacy_id": "qa-flag-nabs-viroc",
        "label": "VIROC",
        "form_type": "school-all-star-cheer",
        "cheer_form_subtype": "school-cheer-viroc-yes",
        "varsity_viroc_customer": "Yes",
        "package_type": "SILVER 1:30",
        "package": "SILVER 1:30",
        "time_length_of_mix": "1:30",
        "music_affiliate": SCHOOL_VIROC_MULTI,
        "mascot": "Flag Hawks",
        "team_coed_all_girl": "Coed",
        "colors": "Navy / Gold",
        "division": "Large Varsity",
        "split_or_no_split": "No Split",
        "sending_eight_count_sheets": "Yes",
        "choreographer_name": "QA Flag Choreo",
        "choreographer_email": "qa.flag.choreo@example.com",
    },
    {
        "legacy_id": "qa-flag-nabs-school-cheer",
        "label": "School Cheer",
        "form_type": "school-all-star-cheer",
        "cheer_form_subtype": "school-cheer-viroc-no",
        "varsity_viroc_customer": "No",
        "package_type": "GOLD 1:30",
        "package": "GOLD 1:30",
        "time_length_of_mix": "1:30",
        "music_affiliate": SCHOOL_VIROC_MULTI,
        "mascot": "Flag Wolves",
        "team_coed_all_girl": "All Girl",
        "colors": "Crimson / White",
        "division": "Medium Varsity",
        "split_or_no_split": "Split",
        "sending_eight_count_sheets": "Yes",
    },
    # --- Dance ---
    {
        "legacy_id": "qa-flag-nabs-pom",
        "label": "Pom",
        "form_type": "school-all-star-dance",
        "dance_form_subtype": "pom",
        "package_type": "CUSTOM POM",
        "package": "CUSTOM POM",
        "time_length_of_mix": "2:00-2:05",
        "music_affiliate": DANCE_MULTI,
        "division": "small senior advanced pom",
        "sending_eight_count_sheets": "Yes",
    },
    {
        "legacy_id": "qa-flag-nabs-hip-hop",
        "label": "Hip Hop",
        "form_type": "school-all-star-dance",
        "dance_form_subtype": "hip-hop",
        "package_type": "DANCE MIX",
        "package": "DANCE MIX",
        "time_length_of_mix": "1:50-1:55",
        "music_affiliate": DANCE_MULTI,
        "division": "open hip hop",
        "sending_eight_count_sheets": "Yes",
    },
    {
        "legacy_id": "qa-flag-nabs-tpv",
        "label": "Team Performance & Variety",
        "form_type": "school-all-star-dance",
        "dance_form_subtype": "team-performance-variety",
        "package_type": "DANCE MIX",
        "package": "DANCE MIX",
        "time_length_of_mix": "2:00-2:05",
        "music_affiliate": DANCE_MULTI,
        "division": "open team performance",
        "sending_eight_count_sheets": "Yes",
    },
    {
        "legacy_id": "qa-flag-nabs-gameday",
        "label": "Gameday",
        "form_type": "school-all-star-dance",
        "dance_form_subtype": "gameday",
        "package_type": "DANCE MIX",
        "package": "DANCE MIX",
        "time_length_of_mix": "1:30-1:35",
        "music_affiliate": DANCE_MULTI,
        "division": "gameday",
        "sending_eight_count_sheets": "Yes",
    },
    {
        "legacy_id": "qa-flag-nabs-jazz-kick",
        "label": "Jazz/Kick",
        "form_type": "school-all-star-dance",
        "dance_form_subtype": "jazz-kick",
        "package_type": "DANCE MIX",
        "package": "DANCE MIX",
        "time_length_of_mix": "1:45-1:50",
        "music_affiliate": DANCE_MULTI,
        "division": "jazz kick",
        "sending_eight_count_sheets": "Yes",
    },
]


def main() -> None:
    db = SessionLocal()
    created = 0
    updated = 0
    try:
        for i, row in enumerate(QA_FLAG_NABS_DEMOS, 1):
            legacy = row["legacy_id"]
            order_pk = seed_uuid("order", legacy)
            existing = db.query(Order).filter(Order.id == order_pk).first()

            multi = row["music_affiliate"]
            contact = f"QA Flag Coach {row['label']}"
            kwargs = dict(
                id=order_pk,
                form_type=row["form_type"],
                cheer_form_subtype=row.get("cheer_form_subtype"),
                dance_form_subtype=row.get("dance_form_subtype"),
                varsity_viroc_customer=row.get("varsity_viroc_customer"),
                school_gym_name=PROGRAM,
                school_gym_billing_address=f"{500 + i} Flag NABS Lane",
                city="Dallas",
                state_province="TX",
                zip_postal_code="75001",
                country="United States",
                team_name=row.get("team_name") or f"Flag Team {i}",
                team_coed_all_girl=row.get("team_coed_all_girl"),
                colors=row.get("colors") or "Black / White",
                division=row.get("division"),
                mascot=row.get("mascot"),
                number_of_copies="1",
                coach_name=contact,
                coach_phone=f"555-8{i:03d}",
                coach_email=f"qa.flag.nabs{i}@example.com",
                billing_person_name=f"QA Flag Billing {i}",
                billing_person_email=f"qa.flag.billing{i}@example.com",
                choreographer_name=row.get("choreographer_name"),
                choreographer_email=row.get("choreographer_email"),
                package_type=row["package_type"],
                package=row["package"],
                time_length_of_mix=row.get("time_length_of_mix"),
                split_or_no_split=row.get("split_or_no_split"),
                # Magento multi-select as received — pricing must stay off until Resolve.
                music_affiliate=multi,
                music_affiliate_selections=multi,
                affiliate_flag_status="open",
                sending_eight_count_sheets=row.get("sending_eight_count_sheets"),
                song_list_suggestions="QA FLAG NABS multi-affiliate demo song list",
                routine_notes=(
                    f"QA FLAG NABS demo — {row['label']}. "
                    "Customer selected multiple music affiliates; resolve one."
                ),
                how_did_you_find_out="Word of Mouth",
                customer_name=f"{contact} ({PROGRAM})",
                contact_name=contact,
                editor_initials="FA",
                requested_editor="First Available",
                status="new",
                price=0.0,
                final_customer_price=None,
                system_calculated_customer_price=None,
                final_customer_price_overridden=False,
                price_compliance=None,
                needs_attention=True,
                attention_reason="Multiple music affiliates selected",
                is_past_order=False,
                is_manual_entry=False,
            )

            if existing:
                for key, value in kwargs.items():
                    if key == "id":
                        continue
                    setattr(existing, key, value)
                updated += 1
                print(f"update {legacy} → {PROGRAM} ({row['label']})")
            else:
                db.add(Order(**kwargs))
                created += 1
                print(f"create {legacy} → {PROGRAM} ({row['label']})")

        db.commit()
        print(
            f"\nDone. created={created} updated={updated} "
            f"total={len(QA_FLAG_NABS_DEMOS)} program={PROGRAM!r}"
        )
        print("Open /orders/flagged — Cheer + Dance tabs should each show one QA FLAG NABS row.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
