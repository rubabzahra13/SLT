"""Seed 2 Orders-tab demos each for All-Star Cheer, Sports Entertainment, School Anthem.

Program / gym / organization / school name: QA OF CAPACITY.
All customer-form fields filled.
"""
import os
import sys
from datetime import date, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.order import Order
from app.seed.ids import seed_uuid

PROGRAM = "QA OF CAPACITY"

QA_OF_CAPACITY_DEMOS = [
    # --- All-Star Cheer ---
    {
        "legacy_id": "qa-cap-cheer-1",
        "form_type": "school-all-star-cheer",
        "cheer_form_subtype": "all-star-cheer",
        "package_type": "GOLD 2:00",
        "package": "GOLD 2:00",
        "time_length_of_mix": "2:00",
        "music_affiliate": "Power Music Covers",
        "price": 950.0,
        "team_name": "Capacity Open",
        "team_coed_all_girl": "All Girl",
        "colors": "Black / Gold",
        "division": "Level 5 Senior Open",
        "number_of_copies": "3",
        "sending_eight_count_sheets": "Yes",
        "song_list_suggestions": "1) Intro hit — Power Music\n2) Stunt section drop\n3) Pyramid climax remix",
        "routine_notes": "Strong tumbling pass at 0:50. Hold cheer vocals under pyramid.",
        "coupon_code": "CAPACITY10",
        "how_did_you_find_out": "Word of Mouth",
        "requested_editor": "First Available",
    },
    {
        "legacy_id": "qa-cap-cheer-2",
        "form_type": "school-all-star-cheer",
        "cheer_form_subtype": "all-star-cheer",
        "package_type": "PLATINUM 2:30",
        "package": "PLATINUM 2:30",
        "time_length_of_mix": "2:30",
        "music_affiliate": "Unleash the Beats",
        "price": 1100.0,
        "team_name": "Capacity Elite",
        "team_coed_all_girl": "Coed",
        "colors": "Navy / White / Silver",
        "division": "Level 4 Large Coed",
        "number_of_copies": "2",
        "sending_eight_count_sheets": "Yes",
        "song_list_suggestions": "1) Arena opener\n2) Mid-mix bass drop\n3) Closing chant bed",
        "routine_notes": "Coed stunt sequence at 1:10. Keep bass loud for floor work.",
        "coupon_code": "CAPACITY25",
        "how_did_you_find_out": "Instagram",
        "requested_editor": "First Available",
    },
    # --- Sports Entertainment ---
    {
        "legacy_id": "qa-cap-se-1",
        "form_type": "sports-entertainment",
        "package_type": "QUARTER BREAK / TIMEOUT REMIXED",
        "package": "QUARTER BREAK / TIMEOUT REMIXED",
        "time_length_of_mix": "1:00",
        "is_rush_order": "No",
        "client_requested_rush_order": "No",
        "price": 150.0,
        "song_list_suggestions": '"Work It" Missy Elliot — timeout stinger + crowd clap',
        "routine_notes": "High volume arena timeout mix. Keep under :55 for TV timeout.",
        "due_offset_days": 14,
    },
    {
        "legacy_id": "qa-cap-se-2",
        "form_type": "sports-entertainment",
        "package_type": "PRE-GAME / HALFTIME REMIXED",
        "package": "PRE-GAME / HALFTIME REMIXED",
        "time_length_of_mix": "2:15",
        "is_rush_order": "Yes",
        "client_requested_rush_order": "Yes",
        "price": 250.0,
        "song_list_suggestions": "Stadium walkout + halftime remix bed with organ hits",
        "routine_notes": "Season opener. Prefer organ hits at section changes. Rush under 7 days.",
        "due_offset_days": 5,
    },
    # --- School Anthem ---
    {
        "legacy_id": "qa-cap-sa-1",
        "form_type": "school-anthem",
        "package_type": "SCHOOL ANTHEMS",
        "package": "SCHOOL ANTHEMS",
        "price": 1250.0,
        "mascot": "Hawks",
        "colors": "Blue & Gold",
        "nicknames": "QA Hawks, Capacity Pride",
        "vocals_preference": "Mixed vocals",
        "song_list_suggestions": "Pop / Rock with marching energy",
        "routine_notes": (
            "Include Go Hawks, Home of Capacity, and ASB pride chants. "
            "Mention football, basketball, and student section."
        ),
        "coupon_code": "ANTHEM-QA1",
    },
    {
        "legacy_id": "qa-cap-sa-2",
        "form_type": "school-anthem",
        "package_type": "SCHOOL ANTHEMS",
        "package": "SCHOOL ANTHEMS",
        "price": 1250.0,
        "mascot": "Wolves",
        "colors": "Crimson & Silver",
        "nicknames": "QA Wolves, The Pack",
        "vocals_preference": "Male vocals",
        "song_list_suggestions": "Orchestral Brass & Strings",
        "routine_notes": "Hail to the Wolves, victorious and strong! Pack pride motif throughout.",
        "coupon_code": "ANTHEM-QA2",
    },
]


def main() -> None:
    db = SessionLocal()
    created = 0
    updated = 0
    try:
        for i, row in enumerate(QA_OF_CAPACITY_DEMOS, 1):
            legacy = row["legacy_id"]
            order_pk = seed_uuid("order", legacy)
            existing = db.query(Order).filter(Order.id == order_pk).first()

            form = row["form_type"]
            n = ((i - 1) % 2) + 1
            if form == "school-all-star-cheer":
                contact = f"QA Capacity Coach {n}"
                billing = f"QA Capacity Billing {n}"
            elif form == "sports-entertainment":
                contact = f"QA Capacity Music Contact {n}"
                billing = f"QA Capacity AP {n}"
            else:
                contact = f"QA Capacity Anthem Contact {n}"
                billing = f"QA Capacity School Billing {n}"

            due = None
            if form == "sports-entertainment":
                due = (
                    date.today() + timedelta(days=int(row.get("due_offset_days") or 14))
                ).isoformat()

            kwargs = dict(
                id=order_pk,
                form_type=form,
                cheer_form_subtype=row.get("cheer_form_subtype"),
                dance_form_subtype=None,
                school_gym_name=PROGRAM,
                school_gym_billing_address=f"{400 + i} Capacity Way, Suite {n}",
                city="Dallas" if form != "sports-entertainment" else "Atlanta",
                state_province="TX" if form != "sports-entertainment" else "GA",
                zip_postal_code="75001" if form != "sports-entertainment" else "30301",
                country="United States",
                team_name=row.get("team_name"),
                team_coed_all_girl=row.get("team_coed_all_girl"),
                colors=row.get("colors") or "Black / White",
                division=row.get("division"),
                mascot=row.get("mascot"),
                nicknames=row.get("nicknames"),
                number_of_copies=row.get("number_of_copies"),
                coach_name=contact,
                coach_phone=f"555-7{i:03d}",
                coach_email=f"qa.capacity{i}@example.com",
                billing_person_name=billing,
                billing_person_email=f"qa.capacity.billing{i}@example.com",
                package_type=row["package_type"],
                package=row["package"],
                time_length_of_mix=row.get("time_length_of_mix"),
                music_affiliate=row.get("music_affiliate"),
                sending_eight_count_sheets=row.get("sending_eight_count_sheets"),
                song_list_suggestions=row.get("song_list_suggestions"),
                routine_notes=row.get("routine_notes"),
                vocals_preference=row.get("vocals_preference"),
                is_rush_order=row.get("is_rush_order"),
                client_requested_rush_order=row.get("client_requested_rush_order"),
                mix_end_date=due,
                client_requested_mix_due_date=due,
                coupon_code=row.get("coupon_code"),
                how_did_you_find_out=row.get("how_did_you_find_out"),
                customer_name=f"{contact} ({PROGRAM})",
                contact_name=contact,
                editor_initials="FA",
                requested_editor=row.get("requested_editor") or "First Available",
                status="new",
                price=float(row["price"]),
                price_compliance="compliant",
                needs_attention=False,
                is_past_order=False,
                is_manual_entry=False,
            )

            if existing:
                for key, value in kwargs.items():
                    if key == "id":
                        continue
                    setattr(existing, key, value)
                updated += 1
                print(f"update {legacy} → {PROGRAM} ({form})")
            else:
                db.add(Order(**kwargs))
                created += 1
                print(f"create {legacy} → {PROGRAM} ({form})")

        db.commit()
        print(
            f"\nDone. created={created} updated={updated} "
            f"total={len(QA_OF_CAPACITY_DEMOS)} program={PROGRAM!r}"
        )
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
