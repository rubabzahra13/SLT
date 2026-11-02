"""Seed Flagged Magento forms + matching manuals for Resolve → Match QA.

One flagged Magento + one unmatched manual per Cheer/Dance subtype that can
raise an affiliate flag. Shared identity (gym/school + address + coach) so
Resolve Affiliate → Match Confirm finds Suggested for You.

Program names: "QA FLAG NABS · {label}" (unique per tab so pairs do not collide).

Youth Rec / Marching Band / Sports Entertainment / School Anthem are skipped —
they have no music affiliate field and cannot raise this flag.
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.order import Order
from app.seed.ids import seed_uuid

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

# Dance — Power+Unleash alone is allowed; add Non compliant to flag.
DANCE_MULTI = "Power Music Covers, Unleash the Beats Covers, Non compliant"
# Exactly two dance covers (normally allowed). Forced open for Resolve QA.
DANCE_TWO_COVERS = "Power Music Covers, Unleash the Beats Covers"

QA_FLAG_NABS_DEMOS = [
    # --- Cheer ---
    {
        "legacy_id": "qa-flag-nabs-all-star",
        "manual_legacy_id": "qa-flag-nabs-manual-all-star",
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
        "manual_legacy_id": "qa-flag-nabs-manual-viroc",
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
        "manual_legacy_id": "qa-flag-nabs-manual-school-cheer",
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
        "manual_legacy_id": "qa-flag-nabs-manual-pom",
        "label": "Pom",
        "form_type": "school-all-star-dance",
        "dance_form_subtype": "pom",
        "package_type": "CUSTOM POM",
        "package": "CUSTOM POM",
        "time_length_of_mix": "2:00",
        "music_affiliate": DANCE_MULTI,
        "division": "small senior advanced pom",
        "sending_eight_count_sheets": "Yes",
    },
    {
        "legacy_id": "qa-flag-nabs-pom-two-covers",
        "manual_legacy_id": "qa-flag-nabs-manual-pom-two-covers",
        "label": "Pom · Power + Unleash",
        "form_type": "school-all-star-dance",
        "dance_form_subtype": "pom",
        "package_type": "CUSTOM POM",
        "package": "CUSTOM POM",
        "time_length_of_mix": "2:00",
        "music_affiliate": DANCE_TWO_COVERS,
        # Product rule: this pair alone does not auto-flag. Keep open for Resolve QA.
        "force_flag_open": True,
        "division": "small senior advanced pom",
        "sending_eight_count_sheets": "Yes",
    },
    {
        "legacy_id": "qa-flag-nabs-hip-hop",
        "manual_legacy_id": "qa-flag-nabs-manual-hip-hop",
        "label": "Hip Hop",
        "form_type": "school-all-star-dance",
        "dance_form_subtype": "hip-hop",
        "package_type": "DANCE MIX",
        "package": "DANCE MIX",
        "time_length_of_mix": "1:55",
        "music_affiliate": DANCE_MULTI,
        "division": "open hip hop",
        "sending_eight_count_sheets": "Yes",
    },
    {
        "legacy_id": "qa-flag-nabs-tpv",
        "manual_legacy_id": "qa-flag-nabs-manual-tpv",
        "label": "Team Performance & Variety",
        "form_type": "school-all-star-dance",
        "dance_form_subtype": "team-performance-variety",
        "package_type": "DANCE MIX",
        "package": "DANCE MIX",
        "time_length_of_mix": "2:00",
        "music_affiliate": DANCE_MULTI,
        "division": "open team performance",
        "sending_eight_count_sheets": "Yes",
    },
    {
        "legacy_id": "qa-flag-nabs-gameday",
        "manual_legacy_id": "qa-flag-nabs-manual-gameday",
        "label": "Gameday",
        "form_type": "school-all-star-dance",
        "dance_form_subtype": "gameday",
        "package_type": "DANCE MIX",
        "package": "DANCE MIX",
        "time_length_of_mix": "1:30",
        "music_affiliate": DANCE_MULTI,
        "division": "gameday",
        "sending_eight_count_sheets": "Yes",
    },
    {
        "legacy_id": "qa-flag-nabs-jazz-kick",
        "manual_legacy_id": "qa-flag-nabs-manual-jazz-kick",
        "label": "Jazz/Kick",
        "form_type": "school-all-star-dance",
        "dance_form_subtype": "jazz-kick",
        "package_type": "DANCE MIX",
        "package": "DANCE MIX",
        "time_length_of_mix": "1:45",
        "music_affiliate": DANCE_MULTI,
        "division": "jazz kick",
        "sending_eight_count_sheets": "Yes",
    },
]


def _program_name(label: str) -> str:
    return f"QA FLAG NABS · {label}"


def _upsert(db, order_pk, kwargs: dict, *, kind: str, legacy: str, label: str) -> str:
    existing = db.query(Order).filter(Order.id == order_pk).first()
    if existing:
        for key, value in kwargs.items():
            if key == "id":
                continue
            setattr(existing, key, value)
        print(f"update {kind} {legacy} → {_program_name(label)}")
        return "updated"
    db.add(Order(**kwargs))
    print(f"create {kind} {legacy} → {_program_name(label)}")
    return "created"


def main() -> None:
    db = SessionLocal()
    created = 0
    updated = 0
    try:
        for i, row in enumerate(QA_FLAG_NABS_DEMOS, 1):
            program = _program_name(row["label"])
            address = f"{500 + i} Flag NABS Lane"
            contact = f"QA Flag Coach {row['label']}"
            phone = f"555-8{i:03d}"
            email = f"qa.flag.nabs{i}@example.com"
            billing_name = f"QA Flag Billing {i}"
            billing_email = f"qa.flag.billing{i}@example.com"
            multi = row["music_affiliate"]

            shared_identity = dict(
                form_type=row["form_type"],
                cheer_form_subtype=row.get("cheer_form_subtype"),
                dance_form_subtype=row.get("dance_form_subtype"),
                varsity_viroc_customer=row.get("varsity_viroc_customer"),
                school_gym_name=program,
                school_gym_billing_address=address,
                city="Dallas",
                state_province="TX",
                zip_postal_code="75001",
                country="United States",
                team_name=row.get("team_name") or f"Flag Team {i}",
                team_coed_all_girl=row.get("team_coed_all_girl"),
                colors=row.get("colors") or "Black / White",
                division=row.get("division"),
                mascot=row.get("mascot"),
                coach_name=contact,
                coach_phone=phone,
                coach_email=email,
                billing_person_name=billing_name,
                billing_person_email=billing_email,
                choreographer_name=row.get("choreographer_name"),
                choreographer_email=row.get("choreographer_email"),
                customer_name=f"{contact} ({program})",
                contact_name=contact,
                editor_initials="FA",
                requested_editor="First Available",
                status="new",
                is_past_order=False,
                merged_form_order_id=None,
                merged_into_manual_order_id=None,
                manual_overlap_snapshot=None,
                # Keep Magento on Flagged until Resolve; manuals stay unmatched.
                suppress_manual_form_merge=True,
            )

            # Magento flagged form
            magento_pk = seed_uuid("order", row["legacy_id"])
            magento_kwargs = dict(
                id=magento_pk,
                **shared_identity,
                number_of_copies="1",
                package_type=row["package_type"],
                package=row["package"],
                time_length_of_mix=row.get("time_length_of_mix"),
                split_or_no_split=row.get("split_or_no_split"),
                music_affiliate=multi,
                music_affiliate_selections=multi,
                affiliate_flag_status="open",
                sending_eight_count_sheets=row.get("sending_eight_count_sheets"),
                song_list_suggestions="QA FLAG NABS multi-affiliate demo song list",
                routine_notes=(
                    f"QA FLAG NABS demo — {row['label']}. "
                    + (
                        "Power Music Covers + Unleash only (forced open for Resolve QA)."
                        if row.get("force_flag_open")
                        else "Customer selected multiple music affiliates; resolve one."
                    )
                ),
                how_did_you_find_out="Word of Mouth",
                price=0.0,
                final_customer_price=None,
                system_calculated_customer_price=None,
                final_customer_price_overridden=False,
                price_compliance=None,
                needs_attention=True,
                attention_reason="Multiple music affiliates selected",
                is_manual_entry=False,
            )
            result = _upsert(
                db,
                magento_pk,
                magento_kwargs,
                kind="magento",
                legacy=row["legacy_id"],
                label=row["label"],
            )
            if result == "created":
                created += 1
            else:
                updated += 1

            # Matching manual (slim Add Order identity) for Resolve → Match
            manual_pk = seed_uuid("order", row["manual_legacy_id"])
            manual_kwargs = dict(
                id=manual_pk,
                **shared_identity,
                package_type="TBD",
                package="TBD",
                time_length_of_mix="",
                music_affiliate="",
                music_affiliate_selections=None,
                affiliate_flag_status=None,
                price=0.0,
                needs_attention=True,
                attention_reason="Manual booking awaiting Magento form",
                is_manual_entry=True,
                routine_notes=f"QA FLAG NABS manual pair for {row['label']}.",
            )
            result = _upsert(
                db,
                manual_pk,
                manual_kwargs,
                kind="manual",
                legacy=row["manual_legacy_id"],
                label=row["label"],
            )
            if result == "created":
                created += 1
            else:
                updated += 1

        db.commit()
        print(
            f"\nDone. created={created} updated={updated} "
            f"pairs={len(QA_FLAG_NABS_DEMOS)}"
        )
        print(
            "1) /orders/flagged — Resolve one affiliate on a QA FLAG NABS · … row\n"
            "2) Match Confirm should open with the matching manual suggested"
        )
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
