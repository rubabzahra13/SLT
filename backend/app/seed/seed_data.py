import os
import json
import uuid
from datetime import datetime, date
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.models import (
    Producer,
    ProducerTimeOff,
    Order,
    MTDRecord,
    ScheduleEntry,
    DiscountCode,
    PackagePrice,
    SecretMenuPricing,
)

MOCK_DATA_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../../src/data/mock-data.json")
)

def parse_date(val: Optional[str]) -> Optional[date]:
    if not val or not isinstance(val, str) or not val.strip():
        return None
    val = val.strip()
    try:
        if "T" in val:
            return datetime.fromisoformat(val.replace("Z", "+00:00")).date()
        return datetime.strptime(val[:10], "%Y-%m-%d").date()
    except Exception:
        return None

def parse_datetime(val: Optional[str]) -> Optional[datetime]:
    if not val or not isinstance(val, str) or not val.strip():
        return None
    val = val.strip()
    try:
        return datetime.fromisoformat(val.replace("Z", "+00:00"))
    except Exception:
        try:
            return datetime.strptime(val[:10], "%Y-%m-%d")
        except Exception:
            return None

def seed_all(db: Session):
    print(f"Loading mock data from {MOCK_DATA_PATH}...")
    if not os.path.exists(MOCK_DATA_PATH):
        raise FileNotFoundError(f"Mock data file not found at {MOCK_DATA_PATH}")

    with open(MOCK_DATA_PATH, "r", encoding="utf-8") as f:
        mock_data: Dict[str, Any] = json.load(f)

    # 1. Seed Producers
    producer_initials_map: Dict[str, Producer] = {}
    producer_legacy_map: Dict[str, Producer] = {}

    raw_producers = mock_data.get("producers", [])
    print(f"Seeding {len(raw_producers)} producers...")
    for p in raw_producers:
        initials = p.get("initials", "").strip()
        legacy_id = p.get("id", "").strip()

        producer = db.query(Producer).filter(Producer.initials == initials).first()
        if not producer:
            producer = Producer(
                legacy_id=legacy_id,
                name=p.get("name", initials),
                initials=initials,
                email=p.get("email", f"{initials.lower()}@soundslikethat.com"),
                specialty=p.get("specialty", "Cheer"),
                avatar=p.get("avatar"),
                mixes_this_week=p.get("mixesThisWeek", 0),
                next_available=p.get("nextAvailable"),
                status=p.get("status", "available"),
                work_days=p.get("workDays", ["mon", "tue", "wed", "thu", "fri"]),
                max_mixes_per_day=p.get("maxMixesPerDay"),
                overtime_days=p.get("overtimeDays", []),
            )
            db.add(producer)
            db.flush()
        else:
            producer.name = p.get("name", producer.name)
            producer.email = p.get("email", producer.email)
            producer.specialty = p.get("specialty", producer.specialty)
            producer.avatar = p.get("avatar", producer.avatar)
            producer.status = p.get("status", producer.status)

        producer_initials_map[initials] = producer
        producer_legacy_map[legacy_id] = producer

        # Seed producer time off if available
        time_offs = p.get("timeOff", [])
        for to in time_offs:
            s_date = parse_date(to.get("startDate"))
            e_date = parse_date(to.get("endDate"))
            if s_date and e_date:
                existing_to = db.query(ProducerTimeOff).filter(
                    ProducerTimeOff.producer_id == producer.id,
                    ProducerTimeOff.start_date == s_date,
                    ProducerTimeOff.end_date == e_date,
                ).first()
                if not existing_to:
                    db.add(ProducerTimeOff(
                        producer_id=producer.id,
                        start_date=s_date,
                        end_date=e_date,
                        type=to.get("type", "holiday"),
                        reason=to.get("reason", ""),
                    ))

    db.commit()

    # 2. Seed Discount Codes
    raw_codes = mock_data.get("discountCodes", [])
    print(f"Seeding {len(raw_codes)} discount codes...")
    for dc in raw_codes:
        code_str = dc.get("code", "").strip().upper()
        existing_dc = db.query(DiscountCode).filter(DiscountCode.code == code_str).first()
        if not existing_dc:
            db.add(DiscountCode(
                legacy_id=dc.get("id"),
                code=code_str,
                description=dc.get("description", ""),
            ))
        else:
            existing_dc.description = dc.get("description", existing_dc.description)

    db.commit()

    # 3. Seed Orders & Past Orders
    raw_orders = mock_data.get("orders", [])
    raw_past_orders = mock_data.get("pastOrders", [])
    order_legacy_map: Dict[str, Order] = {}

    def seed_order_list(order_list: list, is_past: bool):
        for o in order_list:
            legacy_id = o.get("id", "").strip()
            existing_order = db.query(Order).filter(Order.legacy_id == legacy_id).first()

            created_dt = parse_datetime(o.get("createdAt")) or datetime.utcnow()
            completed_dt = parse_datetime(o.get("completedAt"))

            if not existing_order:
                order_obj = Order(
                    legacy_id=legacy_id,
                    form_type=o.get("formType", "school-all-star-cheer"),
                    cheer_form_subtype=o.get("cheerFormSubtype"),
                    dance_form_subtype=o.get("danceFormSubtype"),
                    school_program_name=o.get("schoolProgramName"),
                    school_address=o.get("schoolAddress"),
                    city=o.get("city"),
                    state_province=o.get("stateProvince"),
                    zip_postal_code=o.get("zipPostalCode"),
                    country=o.get("country", "United States"),
                    division=o.get("division"),
                    coach_name=o.get("coachName"),
                    coach_phone=o.get("coachPhone"),
                    coach_email=o.get("coachEmail"),
                    billing_person_name=o.get("billingPersonName"),
                    billing_person_email=o.get("billingPersonEmail"),
                    choreographer_name=o.get("choreographerName"),
                    choreographer_email=o.get("choreographerEmail"),
                    number_of_copies=o.get("numberOfCopies"),
                    package_type=o.get("packageType"),
                    requested_editor=o.get("requestedEditor"),
                    time_length_of_mix=o.get("timeLengthOfMix"),
                    music_affiliate=o.get("musicAffiliate"),
                    power_music_covers=o.get("powerMusicCovers"),
                    routine_notes=o.get("routineNotes"),
                    custom_voiceovers=o.get("customVoiceovers"),
                    gym_name=o.get("gymName"),
                    gym_billing_address=o.get("gymBillingAddress"),
                    team_name=o.get("teamName"),
                    team_coed_all_girl=o.get("teamCoedAllGirl"),
                    team_colors=o.get("teamColors"),
                    school_name=o.get("schoolName"),
                    school_billing_address=o.get("schoolBillingAddress"),
                    mascot=o.get("mascot"),
                    split_or_no_split=o.get("splitOrNoSplit"),
                    viroc_choreographer_name=o.get("virocChoreographerName"),
                    viroc_choreographer_email=o.get("virocChoreographerEmail"),
                    colors=o.get("colors"),
                    billing_address=o.get("billingAddress"),
                    coach_contact_full_name=o.get("coachContactFullName"),
                    coach_email_address=o.get("coachEmailAddress"),
                    email_address=o.get("emailAddress"),
                    sending_eight_count_sheets=o.get("sendingEightCountSheets"),
                    using_eight_count_sheets=o.get("usingEightCountSheets"),
                    song_list_suggestions=o.get("songListSuggestions"),
                    coupon_code=o.get("couponCode"),
                    how_did_you_find_out=o.get("howDidYouFindOut"),
                    customer_name=o.get("customerName") or o.get("programName") or "Unknown Customer",
                    contact_name=o.get("contactName") or o.get("customerName") or "Unknown Contact",
                    program_name=o.get("programName") or "Unknown Program",
                    category=o.get("category", "Cheer"),
                    package=o.get("package", "TBD"),
                    music_theme=o.get("musicTheme"),
                    editor_request=o.get("editorRequest"),
                    requested_producer=o.get("requestedProducer"),
                    price=float(o.get("price", 0)),
                    price_compliance=o.get("priceCompliance"),
                    status=o.get("status", "completed" if is_past else "new"),
                    created_at=created_dt,
                    completed_at=completed_dt,
                    needs_attention=bool(o.get("needsAttention", False)),
                    attention_reason=o.get("attentionReason"),
                    is_past_order=is_past,
                )
                db.add(order_obj)
                db.flush()
                order_legacy_map[legacy_id] = order_obj
            else:
                order_legacy_map[legacy_id] = existing_order

    print(f"Seeding {len(raw_orders)} active orders...")
    seed_order_list(raw_orders, is_past=False)

    print(f"Seeding {len(raw_past_orders)} past orders...")
    seed_order_list(raw_past_orders, is_past=True)

    db.commit()

    # 4. Seed MTD Records
    raw_mtd = mock_data.get("mtdRecords", [])
    print(f"Seeding {len(raw_mtd)} MTD records...")
    for m in raw_mtd:
        legacy_id = m.get("id", "").strip()
        existing_mtd = db.query(MTDRecord).filter(MTDRecord.legacy_id == legacy_id).first()

        # Resolve assigned producer UUID
        assigned_prod_str = m.get("assignedProducer")
        assigned_producer_id = None
        if assigned_prod_str:
            prod = producer_initials_map.get(assigned_prod_str.strip())
            if prod:
                assigned_producer_id = prod.id

        # Resolve linked order UUID
        order_id_str = m.get("orderId")
        linked_order_id = None
        if order_id_str:
            order_ref = order_legacy_map.get(order_id_str.strip())
            if order_ref:
                linked_order_id = order_ref.id

        mix_start = parse_date(m.get("mixStartDate"))
        mix_end = parse_date(m.get("mixEndDate"))
        completed_dt = parse_datetime(m.get("completedAt"))

        if not existing_mtd:
            mtd_obj = MTDRecord(
                legacy_id=legacy_id,
                order_id=linked_order_id,
                section=m.get("section", "CHEERLEADING MUSIC"),
                assigned_producer_id=assigned_producer_id,
                category=m.get("category", "Cheer"),
                editor_request=m.get("editorRequest"),
                contact_name=m.get("contactName", ""),
                editor_initials=m.get("editorInitials") or assigned_prod_str,
                program_name=m.get("programName", ""),
                package=m.get("package", ""),
                music_theme=m.get("musicTheme"),
                price=float(m.get("price", 0)),
                price_compliance=m.get("priceCompliance", "compliant"),
                invoice=m.get("invoice", ""),
                mix_start_date=mix_start,
                mix_end_date=mix_end,
                waiting_on=m.get("waitingOn"),
                eight_count_sheet=m.get("eightCountSheet", ""),
                have_songs=m.get("haveSongs", ""),
                needs_attention=bool(m.get("needsAttention", False)),
                status=m.get("status", "active"),
                record_status=m.get("recordStatus"),
                in_payroll=bool(m.get("inPayroll", False)),
                completed_at=completed_dt,
            )
            db.add(mtd_obj)
        else:
            existing_mtd.assigned_producer_id = assigned_producer_id or existing_mtd.assigned_producer_id
            existing_mtd.invoice = m.get("invoice", existing_mtd.invoice)

    db.commit()

    # 5. Seed Schedule Entries
    raw_schedule = mock_data.get("schedule", [])
    print(f"Seeding {len(raw_schedule)} schedule entries...")
    for s in raw_schedule:
        prod_initials = s.get("producer", "").strip()
        day_str = s.get("day", "").strip()
        prod = producer_initials_map.get(prod_initials)

        existing_entry = db.query(ScheduleEntry).filter(
            ScheduleEntry.producer_initials == prod_initials,
            ScheduleEntry.day == day_str,
        ).first()

        if not existing_entry:
            db.add(ScheduleEntry(
                producer_id=prod.id if prod else None,
                producer_initials=prod_initials,
                day=day_str,
                status=s.get("status", "available"),
                count=s.get("count", 0),
            ))

    db.commit()
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_all(db)
    finally:
        db.close()
