"""Map Magento WebForms submissions into orders rows.

Mappings are keyed by Magento field_id, not field code. Select fields arrive
as the option label ("Gold Package", "All-Girl", "Yes").
"""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Literal, Optional, Set

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.order import Order
from app.schemas.order import OrderSchema
from app.services.board_events import board_event_hub
from app.services.dance_song_covers import pack_dance_song_covers

MagentoIngestStatus = Literal[
    "created",
    "skipped_duplicate",
    "skipped_cutoff",
    "skipped_form_mismatch",
    "skipped_unroutable",
    "skipped_missing_result_id",
]


@dataclass(frozen=True)
class MagentoIngestResult:
    """Outcome of ingesting one Magento WebForms result into ``orders``."""

    status: MagentoIngestStatus
    result_id: Optional[str] = None
    order: Optional[dict[str, Any]] = None
    message: Optional[str] = None

# Same console as uvicorn so poll results are visible in the server terminal.
logger = logging.getLogger("uvicorn.error")

# Magento created_at strings have no offset. Staging returns UTC.
_MAGENTO_TS = "%Y-%m-%d %H:%M:%S"
_MISSING_VALUE = "Error: Unable to find value"

# Form 1 field_id → orders column. Address line 2 is its own column.
FORM_1_FIELD_COLUMNS: dict[str, str] = {
    "1": "school_gym_name",
    "2": "school_gym_billing_address",
    "3": "school_gym_billing_address_line_2",
    "4": "city",
    "5": "state_province",
    "6": "zip_postal_code",
    "7": "country",
    "8": "team_name",
    "9": "division",
    "10": "team_coed_all_girl",
    "11": "colors",
    "12": "number_of_copies",
    "13": "coach_name",
    "14": "coach_phone",
    "15": "coach_email",
    "16": "billing_person_name",
    "17": "billing_person_email",
    "272": "requested_editor",
    "19": "package_type",
    "20": "time_length_of_mix",
    "21": "music_affiliate",
    "22": "sending_eight_count_sheets",
    "23": "song_list_suggestions",
    "24": "routine_notes",
    "25": "coupon_code",
    "26": "how_did_you_find_out",
}

# Form 14 (VROC). Field 308 and 309 share the code mix-music-affiliate.
# 287 is address line 2, stored on its own column (same as Form 1 field 3).
FORM_14_FIELD_COLUMNS: dict[str, str] = {
    "285": "school_gym_name",
    "286": "school_gym_billing_address",
    "287": "school_gym_billing_address_line_2",
    "288": "city",
    "289": "state_province",
    "290": "zip_postal_code",
    "291": "country",
    "292": "mascot",
    "293": "division",
    "294": "team_coed_all_girl",
    "295": "colors",
    "296": "number_of_copies",
    "297": "coach_name",
    "298": "coach_phone",
    "299": "coach_email",
    "300": "billing_person_name",
    "301": "billing_person_email",
    "302": "choreographer_name",
    "303": "choreographer_email",
    "305": "requested_editor",
    "306": "package_type",
    "307": "time_length_of_mix",
    "308": "split_or_no_split",
    "309": "music_affiliate",
    "310": "sending_eight_count_sheets",
    "311": "song_list_suggestions",
    "312": "routine_notes",
    "313": "coupon_code",
    "314": "how_did_you_find_out",
}

# Form 2 is one Magento form behind two site pages. Field 49 and 50 share
# the code mix-music-affiliate: 49 is split, 50 is the affiliate.
FORM_2_FIELD_COLUMNS: dict[str, str] = {
    "27": "school_gym_name",
    "28": "school_gym_billing_address",
    "29": "school_gym_billing_address_line_2",
    "30": "city",
    "31": "state_province",
    "32": "zip_postal_code",
    "33": "country",
    "34": "mascot",
    "35": "division",
    "36": "team_coed_all_girl",
    "37": "colors",
    "38": "number_of_copies",
    "39": "coach_name",
    "40": "coach_phone",
    "41": "coach_email",
    "42": "billing_person_name",
    "43": "billing_person_email",
    "44": "choreographer_name",
    "45": "choreographer_email",
    "273": "requested_editor",
    "47": "package_type",
    "48": "time_length_of_mix",
    "49": "split_or_no_split",
    "50": "music_affiliate",
    "51": "sending_eight_count_sheets",
    "52": "song_list_suggestions",
    "53": "routine_notes",
    "54": "coupon_code",
    "55": "how_did_you_find_out",
}

# Form 3 Youth Rec. Field 60 is address line 2 (own column). Field 69 is the
# extra contact phone, not coach_phone (field 67).
FORM_3_FIELD_COLUMNS: dict[str, str] = {
    "56": "school_gym_name",
    "57": "team_name",
    "58": "colors",
    "59": "school_gym_billing_address",
    "60": "school_gym_billing_address_line_2",
    "61": "city",
    "62": "state_province",
    "63": "zip_postal_code",
    "64": "country",
    "65": "coach_name",
    "66": "coach_email",
    "67": "coach_phone",
    "68": "billing_person_email",
    "69": "contact_phone_for_youth_rec_cheer",
    "70": "package_type",
    "71": "time_length_of_mix",
    "72": "split_or_no_split",
    "73": "number_of_copies",
    "74": "sending_eight_count_sheets",
    "75": "song_list_suggestions",
    "76": "routine_notes",
    "77": "coupon_code",
    "78": "how_did_you_find_out",
}

# Form 4 POM. 98 and 99 pack into song_list_suggestions (not their own columns).
# 97 is a checkbox list: stored on music_affiliate and music_affiliate_selections.
FORM_4_FIELD_COLUMNS: dict[str, str] = {
    "79": "school_gym_name",
    "80": "school_gym_billing_address",
    "81": "school_gym_billing_address_line_2",
    "82": "city",
    "83": "state_province",
    "84": "zip_postal_code",
    "85": "country",
    "86": "division",
    "87": "coach_name",
    "88": "coach_phone",
    "89": "coach_email",
    "90": "billing_person_name",
    "91": "billing_person_email",
    "92": "choreographer_name",
    "93": "choreographer_email",
    "94": "number_of_copies",
    "95": "package_type",
    "275": "requested_editor",
    "96": "time_length_of_mix",
    "97": "music_affiliate",
    "100": "routine_notes",
    "101": "custom_voiceovers",
    "102": "voiceover_script",
    "280": "pronunciation_guidance",
    "103": "coupon_code",
}

# Form 5 Hip Hop. Same columns as POM. 122 and 123 pack into song_list_suggestions.
FORM_5_FIELD_COLUMNS: dict[str, str] = {
    "104": "school_gym_name",
    "105": "school_gym_billing_address",
    "106": "school_gym_billing_address_line_2",
    "107": "city",
    "108": "state_province",
    "109": "zip_postal_code",
    "110": "country",
    "111": "division",
    "112": "coach_name",
    "113": "coach_phone",
    "114": "coach_email",
    "115": "billing_person_name",
    "116": "billing_person_email",
    "117": "choreographer_name",
    "118": "choreographer_email",
    "274": "number_of_copies",
    "119": "package_type",
    "276": "requested_editor",
    "120": "time_length_of_mix",
    "121": "music_affiliate",
    "124": "routine_notes",
    "125": "custom_voiceovers",
    "126": "voiceover_script",
    "281": "pronunciation_guidance",
    "127": "coupon_code",
}

# Form 6 Team Performance & Variety. Same columns as POM, plus style (144).
# 148 and 149 pack into song_list_suggestions.
FORM_6_FIELD_COLUMNS: dict[str, str] = {
    "128": "school_gym_name",
    "129": "school_gym_billing_address",
    "130": "school_gym_billing_address_line_2",
    "131": "city",
    "132": "state_province",
    "133": "zip_postal_code",
    "134": "country",
    "135": "coach_name",
    "136": "coach_phone",
    "137": "coach_email",
    "138": "billing_person_name",
    "139": "billing_person_email",
    "140": "choreographer_name",
    "141": "choreographer_email",
    "142": "number_of_copies",
    "143": "division",
    "144": "style",
    "277": "requested_editor",
    "145": "package_type",
    "146": "time_length_of_mix",
    "147": "music_affiliate",
    "150": "routine_notes",
    "151": "custom_voiceovers",
    "152": "voiceover_script",
    "282": "pronunciation_guidance",
    "153": "coupon_code",
}

# Form 7 Gameday. No division. Style (169) is style; the UI reads it as styleOfGamedayMix.
# 173 and 174 pack into song_list_suggestions. Copies (172) is a text field.
FORM_7_FIELD_COLUMNS: dict[str, str] = {
    "154": "school_gym_name",
    "155": "school_gym_billing_address",
    "156": "school_gym_billing_address_line_2",
    "157": "city",
    "158": "state_province",
    "159": "zip_postal_code",
    "160": "country",
    "161": "coach_name",
    "162": "coach_phone",
    "163": "coach_email",
    "164": "billing_person_name",
    "165": "billing_person_email",
    "166": "choreographer_name",
    "167": "choreographer_email",
    "172": "number_of_copies",
    "168": "package_type",
    "169": "style",
    "170": "time_length_of_mix",
    "279": "requested_editor",
    "171": "music_affiliate",
    "175": "routine_notes",
    "176": "custom_voiceovers",
    "177": "voiceover_script",
    "283": "pronunciation_guidance",
    "178": "coupon_code",
}

# Form 8 Jazz/Kick. Same columns as Team Performance, plus licensing (198).
# 200 and 201 pack into song_list_suggestions.
FORM_8_FIELD_COLUMNS: dict[str, str] = {
    "179": "school_gym_name",
    "180": "school_gym_billing_address",
    "181": "school_gym_billing_address_line_2",
    "182": "city",
    "183": "state_province",
    "184": "zip_postal_code",
    "185": "country",
    "186": "coach_name",
    "187": "coach_phone",
    "188": "coach_email",
    "189": "billing_person_name",
    "190": "billing_person_email",
    "191": "choreographer_name",
    "192": "choreographer_email",
    "193": "number_of_copies",
    "194": "division",
    "195": "style",
    "278": "requested_editor",
    "196": "package_type",
    "197": "time_length_of_mix",
    "198": "licensing_required",
    "199": "music_affiliate",
    "202": "routine_notes",
    "203": "custom_voiceovers",
    "204": "voiceover_script",
    "284": "pronunciation_guidance",
    "205": "coupon_code",
}

# Form 9 Marching Band. No subtype. 220 is instrumentation (song_list_suggestions).
# 221 is lyrics (routine_notes). 208 is the existing address line 2 column.
FORM_9_FIELD_COLUMNS: dict[str, str] = {
    "206": "school_gym_name",
    "207": "school_gym_billing_address",
    "208": "school_gym_billing_address_line_2",
    "209": "city",
    "210": "state_province",
    "211": "zip_postal_code",
    "212": "country",
    "213": "coach_name",
    "214": "coach_phone",
    "215": "coach_email",
    "216": "billing_person_name",
    "217": "billing_person_email",
    "218": "package_type",
    "219": "time_length_of_mix",
    "220": "song_list_suggestions",
    "221": "routine_notes",
}

# Form 10 Pro Team / Sports Entertainment. No subtype.
# 225 is appended onto the billing address. It does not use the line-2 column.
FORM_10_FIELD_COLUMNS: dict[str, str] = {
    "223": "school_gym_name",
    "224": "school_gym_billing_address",
    "226": "city",
    "227": "state_province",
    "228": "zip_postal_code",
    "229": "country",
    "230": "coach_name",
    "231": "coach_phone",
    "232": "coach_email",
    "233": "billing_person_name",
    "234": "billing_person_email",
    "235": "package_type",
    "236": "client_requested_mix_due_date",
    "237": "client_requested_rush_order",
    "238": "time_length_of_mix",
    "239": "song_list_suggestions",
    "240": "routine_notes",
}

# Form 11 School Anthem. No package field on Magento. 257 is instrumental
# style and is stored on song_list_suggestions, not the style column.
# 243 is appended onto the billing address.
FORM_11_FIELD_COLUMNS: dict[str, str] = {
    "241": "school_gym_name",
    "242": "school_gym_billing_address",
    "244": "city",
    "245": "state_province",
    "246": "zip_postal_code",
    "247": "country",
    "248": "coach_name",
    "249": "coach_phone",
    "250": "coach_email",
    "251": "billing_person_name",
    "252": "billing_person_email",
    "253": "mascot",
    "254": "colors",
    "255": "nicknames",
    "256": "vocals_preference",
    "257": "song_list_suggestions",
    "258": "routine_notes",
    "259": "coupon_code",
}

# Magento cover boxes → pack_dance_song_covers slots.
DANCE_COVER_SLOTS: dict[int, dict[str, str]] = {
    4: {"98": "power", "99": "unleash"},
    5: {"122": "power", "123": "unleash"},
    6: {"148": "power", "149": "unleash"},
    7: {"173": "power", "174": "unleash"},
    8: {"200": "power", "201": "unleash"},
}

# Address line 2 that is appended onto school_gym_billing_address.
ADDRESS_LINE2_APPEND_FIELD: dict[int, str] = {
    10: "225",
    11: "243",
}

FIELD_COLUMNS_BY_FORM: dict[int, dict[str, str]] = {
    1: FORM_1_FIELD_COLUMNS,
    2: FORM_2_FIELD_COLUMNS,
    3: FORM_3_FIELD_COLUMNS,
    4: FORM_4_FIELD_COLUMNS,
    5: FORM_5_FIELD_COLUMNS,
    6: FORM_6_FIELD_COLUMNS,
    7: FORM_7_FIELD_COLUMNS,
    8: FORM_8_FIELD_COLUMNS,
    9: FORM_9_FIELD_COLUMNS,
    10: FORM_10_FIELD_COLUMNS,
    11: FORM_11_FIELD_COLUMNS,
    14: FORM_14_FIELD_COLUMNS,
}

FORM_ROUTES: dict[int, dict[str, str]] = {
    1: {
        "form_type": "school-all-star-cheer",
        "cheer_form_subtype": "all-star-cheer",
    },
    3: {
        "form_type": "school-all-star-cheer",
        "cheer_form_subtype": "youth-rec-cheer",
    },
    4: {
        "form_type": "school-all-star-dance",
        "dance_form_subtype": "pom",
    },
    5: {
        "form_type": "school-all-star-dance",
        "dance_form_subtype": "hip-hop",
    },
    6: {
        "form_type": "school-all-star-dance",
        "dance_form_subtype": "team-performance-variety",
    },
    7: {
        "form_type": "school-all-star-dance",
        "dance_form_subtype": "gameday",
    },
    8: {
        "form_type": "school-all-star-dance",
        "dance_form_subtype": "jazz-kick",
    },
    9: {
        "form_type": "marching-band",
    },
    10: {
        "form_type": "sports-entertainment",
    },
    11: {
        "form_type": "school-anthem",
    },
    14: {
        "form_type": "school-all-star-cheer",
        "cheer_form_subtype": "school-cheer-viroc-yes",
        "varsity_viroc_customer": "Yes",
    },
}

# Forms the poller knows how to insert. Form 2's subtype comes from the page URL.
SYNC_FORM_IDS = frozenset({1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 14})

_FORM_2_BASE = {"form_type": "school-all-star-cheer"}
_VIROC_YES_ROUTE = {
    **_FORM_2_BASE,
    "cheer_form_subtype": "school-cheer-viroc-yes",
    "varsity_viroc_customer": "Yes",
}
_VIROC_NO_ROUTE = {
    **_FORM_2_BASE,
    "cheer_form_subtype": "school-cheer-viroc-no",
    "varsity_viroc_customer": "No",
}


def clean_magento_value(value: Any) -> Optional[str]:
    """Store the submitted label. Missing-field errors become empty."""
    if value is None:
        return None
    text = str(value).strip()
    if not text or text.startswith(_MISSING_VALUE):
        return None
    return text


def parse_magento_timestamp(value: Any) -> datetime:
    text = str(value or "").strip()
    try:
        parsed = datetime.strptime(text, _MAGENTO_TS)
    except ValueError:
        parsed = datetime.now(timezone.utc).replace(tzinfo=None)
        logger.warning("Magento timestamp %r is not %s; using current UTC", text, _MAGENTO_TS)
    return parsed.replace(tzinfo=timezone.utc)


def _page_url(blob: Any) -> str:
    """URL from submitted_from_serialized or referrer_page (string JSON or object)."""
    if blob is None:
        return ""
    data: Any = blob
    if isinstance(blob, str):
        text = blob.strip()
        if not text:
            return ""
        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            return text
    if isinstance(data, dict):
        return str(data.get("url") or "")
    return ""


def submission_source_url(result: dict[str, Any]) -> str:
    """Page that posted the form. submitted_from wins; referrer is the fallback."""
    url = _page_url(result.get("submitted_from_serialized"))
    if url:
        return url
    return _page_url(result.get("referrer_page"))


def route_form2(result: dict[str, Any]) -> Optional[dict[str, str]]:
    """School Cheer and V!ROC share form 2. The page path is the subtype."""
    url = submission_source_url(result).lower()
    if "vroccheerorder" in url:
        return dict(_VIROC_YES_ROUTE)
    if "schoolcheerorder" in url:
        return dict(_VIROC_NO_ROUTE)
    return None


def submission_is_after_cutoff(result: dict[str, Any], cutoff: datetime) -> bool:
    """True when Magento created_at is strictly after the forward-only cursor."""
    stamp = parse_magento_timestamp(result.get("created_at"))
    if cutoff.tzinfo is None:
        cutoff = cutoff.replace(tzinfo=timezone.utc)
    return stamp > cutoff


def ensure_import_cutoff(db: Session) -> datetime:
    """Persist the moment forward-only polling starts. Older rows stay in Magento."""
    db.execute(text(
        """
        CREATE TABLE IF NOT EXISTS magento_poll_cursor (
            id INTEGER PRIMARY KEY,
            import_after TIMESTAMPTZ NOT NULL
        )
        """
    ))
    row = db.execute(text(
        "SELECT import_after FROM magento_poll_cursor WHERE id = 1"
    )).first()
    if row and row[0] is not None:
        value = row[0]
        if getattr(value, "tzinfo", None) is None:
            value = value.replace(tzinfo=timezone.utc)
        return value
    now = datetime.now(timezone.utc)
    db.execute(text(
        """
        INSERT INTO magento_poll_cursor (id, import_after)
        VALUES (1, :ts)
        ON CONFLICT (id) DO NOTHING
        """
    ), {"ts": now})
    db.commit()
    stored = db.execute(text(
        "SELECT import_after FROM magento_poll_cursor WHERE id = 1"
    )).first()
    value = stored[0] if stored and stored[0] is not None else now
    if getattr(value, "tzinfo", None) is None:
        value = value.replace(tzinfo=timezone.utc)
    logger.info(
        "Magento poll cutoff is %s; submissions at or before that stay in Magento",
        value.isoformat(),
    )
    return value


def resolve_form_route(form_id: int, result: dict[str, Any]) -> Optional[dict[str, str]]:
    if form_id == 2:
        return route_form2(result)
    return FORM_ROUTES.get(form_id)


def order_values_from_result(result: dict[str, Any], form_id: int) -> Optional[dict[str, Any]]:
    route = resolve_form_route(form_id, result)
    form_type = (route or {}).get("form_type")
    cheer_subtype = (route or {}).get("cheer_form_subtype")
    dance_subtype = (route or {}).get("dance_form_subtype")
    if not form_type:
        return None
    columns: dict[str, Any] = {
        "form_type": route["form_type"],
        "magento_form_id": str(form_id),
        "magento_result_id": str(result.get("result_id") or "").strip() or None,
        "status": "new",
        "is_manual_entry": False,
        "price": 0,
        "created_at": parse_magento_timestamp(result.get("created_at")),
    }
    if cheer_subtype:
        columns["cheer_form_subtype"] = cheer_subtype
    if dance_subtype:
        columns["dance_form_subtype"] = dance_subtype
    if route.get("varsity_viroc_customer"):
        columns["varsity_viroc_customer"] = route["varsity_viroc_customer"]
    field_map = FIELD_COLUMNS_BY_FORM.get(form_id, {})
    cover_slots = DANCE_COVER_SLOTS.get(form_id, {})
    append_field = ADDRESS_LINE2_APPEND_FIELD.get(form_id)
    covers = {"power": None, "unleash": None}
    address_line2 = None
    for field in result.get("fields") or []:
        field_id = str(field.get("field_id") or "").strip()
        if append_field and field_id == append_field:
            address_line2 = clean_magento_value(field.get("value"))
            continue
        if field_id in cover_slots:
            covers[cover_slots[field_id]] = clean_magento_value(field.get("value"))
            continue
        column = field_map.get(field_id)
        if not column:
            continue
        columns[column] = clean_magento_value(field.get("value"))
    if append_field:
        parts = [
            part
            for part in (columns.get("school_gym_billing_address"), address_line2)
            if part
        ]
        columns["school_gym_billing_address"] = "\n".join(parts) or None
    if cover_slots:
        packed = pack_dance_song_covers(covers["power"], covers["unleash"])
        columns["song_list_suggestions"] = packed or None
    if dance_subtype and columns.get("music_affiliate"):
        columns["music_affiliate_selections"] = columns["music_affiliate"]
    coach = columns.get("coach_name")
    columns["customer_name"] = coach
    columns["contact_name"] = coach
    if form_type == "school-anthem":
        columns["package_type"] = "SCHOOL ANTHEMS"
    package = columns.get("package_type")
    if package:
        columns["package"] = package
    return columns


def extract_results(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if isinstance(payload, dict):
        for key in ("items", "results", "data"):
            items = payload.get(key)
            if isinstance(items, list):
                return [item for item in items if isinstance(item, dict)]
    raise ValueError("WebForms results payload was not a list")


def fetch_form_results(form_id: int, timeout: int = 120) -> list[dict[str, Any]]:
    token = (settings.WF_ACCESS_TOKEN or "").strip()
    if not token:
        raise RuntimeError("WF_ACCESS_TOKEN is not set")
    base = (settings.WF_BASE or "https://staging.powermusiccheer.com/rest").rstrip("/")
    url = f"{base}/V1/webforms/form/{form_id}/results"
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {token}",
            "User-Agent": "slt-magento-poll/1.0",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")[:300]
        raise RuntimeError(f"Magento form {form_id} HTTP {exc.code}: {detail}") from exc
    return extract_results(json.loads(body))


def _publish_magento_order_created(order_payload: dict[str, Any]) -> None:
    """Same board event shape as ``POST /api/orders`` / the local Magento poller."""
    board_event_hub.publish({"type": "order.updated", "order": order_payload})


def ingest_magento_result(
    db: Session,
    form_id: int,
    result: dict[str, Any],
    *,
    cutoff: Optional[datetime] = None,
    known_result_ids: Optional[Set[str]] = None,
    publish_board_event: bool = False,
) -> MagentoIngestResult:
    """Insert one Magento WebForms result using the existing CRM mapping rules.

    Designed for reuse by the local poller and a future VPS→Vercel ingest endpoint.

    When ``cutoff`` is omitted, loads (or creates once) the shared forward-only
    cursor via ``ensure_import_cutoff``. Pass an explicit cutoff from batch
    pollers to avoid repeated cursor reads.

    When ``known_result_ids`` is provided it is treated as an authoritative
    in-memory duplicate set (and updated by the caller on create/duplicate).
    When omitted, duplicates are detected with a per-id DB lookup plus the
    unique constraint on ``orders.magento_result_id``.

    Dashboard publishing defaults off so the existing poller can keep publishing
    once per tick; set ``publish_board_event=True`` for single-shot ingest paths.
    """
    result_id = str(result.get("result_id") or "").strip() or None
    if not result_id:
        return MagentoIngestResult(status="skipped_missing_result_id")

    if known_result_ids is not None:
        if result_id in known_result_ids:
            return MagentoIngestResult(
                status="skipped_duplicate",
                result_id=result_id,
            )
    else:
        existing = (
            db.query(Order.id)
            .filter(Order.magento_result_id == result_id)
            .first()
        )
        if existing:
            return MagentoIngestResult(
                status="skipped_duplicate",
                result_id=result_id,
            )

    resolved_cutoff = cutoff if cutoff is not None else ensure_import_cutoff(db)
    if not submission_is_after_cutoff(result, resolved_cutoff):
        return MagentoIngestResult(
            status="skipped_cutoff",
            result_id=result_id,
        )

    incoming_form = result.get("form_id")
    if incoming_form is not None and str(incoming_form) != str(form_id):
        return MagentoIngestResult(
            status="skipped_form_mismatch",
            result_id=result_id,
            message=f"result form_id {incoming_form!r} != requested {form_id}",
        )

    values = order_values_from_result(result, form_id)
    if not values:
        logger.warning(
            "Magento form %s result %s has no CRM route (page URL missing or unknown); skipping",
            form_id,
            result_id,
        )
        return MagentoIngestResult(
            status="skipped_unroutable",
            result_id=result_id,
            message="no CRM route (page URL missing or unknown)",
        )
    if not values.get("magento_result_id"):
        return MagentoIngestResult(
            status="skipped_missing_result_id",
            result_id=result_id,
        )

    order = Order(**values)
    db.add(order)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return MagentoIngestResult(
            status="skipped_duplicate",
            result_id=result_id,
            message="unique magento_result_id conflict",
        )

    db.refresh(order)
    payload = OrderSchema.model_validate(order).model_dump(mode="json")
    if publish_board_event:
        _publish_magento_order_created(payload)
    return MagentoIngestResult(
        status="created",
        result_id=result_id,
        order=payload,
    )


def upsert_form_results(
    db: Session,
    form_id: int,
    results: list[dict[str, Any]],
    cutoff: datetime,
) -> tuple[list[dict[str, Any]], int]:
    """Insert submissions newer than cutoff that are not already stored.

    Returns API payloads for new rows, and how many older submissions were left in Magento.
    """
    before_cutoff = 0
    known = {
        row[0]
        for row in db.query(Order.magento_result_id)
        .filter(Order.magento_result_id.isnot(None))
        .all()
    }
    created: list[dict[str, Any]] = []
    for result in results:
        outcome = ingest_magento_result(
            db,
            form_id,
            result,
            cutoff=cutoff,
            known_result_ids=known,
            publish_board_event=False,
        )
        if outcome.status == "skipped_cutoff":
            before_cutoff += 1
            continue
        if outcome.status == "created" and outcome.order is not None:
            if outcome.result_id:
                known.add(outcome.result_id)
            created.append(outcome.order)
            continue
        if outcome.status == "skipped_duplicate" and outcome.result_id:
            known.add(outcome.result_id)
    return created, before_cutoff


def configured_poll_form_ids() -> list[int]:
    """Parsed MAGENTO_POLL_FORM_IDS that have a CRM route."""
    out: list[int] = []
    for raw_id in settings.MAGENTO_POLL_FORM_IDS.split(","):
        form_text = raw_id.strip()
        if not form_text:
            continue
        form_id = int(form_text)
        if form_id not in SYNC_FORM_IDS:
            logger.warning("Magento form %s has no CRM route yet; skipping", form_id)
            continue
        out.append(form_id)
    return out


def sync_one_form(form_id: int) -> list[dict[str, Any]]:
    """Fetch Magento without holding a DB connection, then upsert briefly.

    Keeps the pool free during the Magento HTTP wait so board/counts requests
    are less likely to queue behind a long poll tick.
    """
    if form_id not in SYNC_FORM_IDS:
        logger.warning("Magento form %s has no CRM route yet; skipping", form_id)
        return []

    results = fetch_form_results(form_id)

    from app.core.database import SessionLocal

    db = SessionLocal()
    try:
        cutoff = ensure_import_cutoff(db)
        batch, before_cutoff = upsert_form_results(db, form_id, results, cutoff)
        logger.info(
            "Magento form %s: %s submissions, %s new orders, %s before cutoff",
            form_id,
            len(results),
            len(batch),
            before_cutoff,
        )
        if batch:
            from app.services.form_chip_cache import invalidate_order_read_caches

            invalidate_order_read_caches()
        return batch
    finally:
        db.close()


def sync_configured_forms(db: Session | None = None) -> list[dict[str, Any]]:
    """Sync every configured form.

    Prefer ``sync_one_form`` from the async poller (per-form session + gap).
    When ``db`` is passed (tests / one-shot), Magento HTTP still runs outside
    any caller-held connection per form; upserts reuse ``db``.
    """
    created: list[dict[str, Any]] = []
    form_ids = configured_poll_form_ids()
    if db is None:
        for form_id in form_ids:
            created.extend(sync_one_form(form_id))
        return created

    cutoff = ensure_import_cutoff(db)
    for form_id in form_ids:
        # Fetch while not needing the session for network I/O; expire so the
        # connection can be checked in between forms when the pool is tight.
        results = fetch_form_results(form_id)
        batch, before_cutoff = upsert_form_results(db, form_id, results, cutoff)
        logger.info(
            "Magento form %s: %s submissions, %s new orders, %s before cutoff",
            form_id,
            len(results),
            len(batch),
            before_cutoff,
        )
        created.extend(batch)
        db.commit()
        db.expire_all()
    if created:
        from app.services.form_chip_cache import invalidate_order_read_caches

        invalidate_order_read_caches()
    return created
