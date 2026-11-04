"""Opaque page tokens: offset (legacy) + keyset (boards)."""

from __future__ import annotations

import base64
import json
from datetime import datetime
from typing import Any, Sequence, TypeVar
from uuid import UUID

from fastapi import HTTPException, Query
from sqlalchemy import and_, or_

T = TypeVar("T")

DEFAULT_PAGE_SIZE = 100
MAX_PAGE_SIZE = 500


def page_size_query(
    page_size: int | None = Query(
        None,
        ge=1,
        le=MAX_PAGE_SIZE,
        description=f"Max items to return (default {DEFAULT_PAGE_SIZE}, max {MAX_PAGE_SIZE}).",
    ),
) -> int:
    return page_size if page_size is not None else DEFAULT_PAGE_SIZE


def page_token_query(
    page_token: str | None = Query(
        None,
        description="Opaque token from a previous list response's next_page_token.",
    ),
) -> str | None:
    return page_token


def _b64_encode(payload: dict[str, Any]) -> str:
    raw = json.dumps(payload, separators=(",", ":"), default=str).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _b64_decode(page_token: str) -> dict[str, Any]:
    raw = base64.urlsafe_b64decode(page_token.encode("ascii") + b"===")
    payload = json.loads(raw.decode("utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("token payload must be object")
    return payload


def decode_page_token(page_token: str | None) -> int:
    """Return the 0-based offset encoded in page_token (0 if absent)."""
    if not page_token:
        return 0
    try:
        payload = _b64_decode(page_token)
        if "c" in payload and "i" in payload:
            raise ValueError("keyset token used with offset decoder")
        offset = int(payload.get("o", 0))
        if offset < 0:
            raise ValueError("negative offset")
        return offset
    except Exception as exc:  # noqa: BLE001: invalid client token
        raise HTTPException(status_code=400, detail="Invalid page_token") from exc


def encode_page_token(offset: int) -> str:
    return _b64_encode({"o": offset})


def encode_keyset_token(
    *,
    created_at: datetime | None,
    row_id: UUID | str,
    sort: str = "newest",
) -> str:
    return _b64_encode(
        {
            "v": 2,
            "s": sort,
            "c": created_at.isoformat() if created_at else None,
            "i": str(row_id),
        }
    )


def decode_keyset_token(page_token: str | None) -> dict[str, Any] | None:
    """Return keyset cursor dict, or None for first page. Raises on bad token."""
    if not page_token:
        return None
    try:
        payload = _b64_decode(page_token)
        # Legacy offset tokens are rejected for keyset endpoints.
        if "o" in payload and "c" not in payload:
            raise ValueError("offset token not valid for keyset list")
        created = payload.get("c")
        row_id = payload.get("i")
        if not row_id:
            raise ValueError("missing id")
        return {
            "sort": str(payload.get("s") or "newest"),
            "created_at": datetime.fromisoformat(created) if created else None,
            "id": str(row_id),
        }
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail="Invalid page_token") from exc


def paginate_sequence(
    rows: Sequence[T],
    *,
    page_size: int,
    page_token: str | None,
) -> tuple[list[T], str | None]:
    """Slice an in-memory sequence and return (page, next_page_token)."""
    offset = decode_page_token(page_token)
    size = min(max(page_size, 1), MAX_PAGE_SIZE)
    page = list(rows[offset : offset + size])
    next_offset = offset + len(page)
    next_token = (
        encode_page_token(next_offset) if next_offset < len(rows) else None
    )
    return page, next_token


def paginate_query(
    query: Any,
    *,
    page_size: int,
    page_token: str | None,
) -> tuple[list[Any], str | None]:
    """Apply LIMIT/OFFSET to a SQLAlchemy query; fetch size+1 to detect more."""
    offset = decode_page_token(page_token)
    size = min(max(page_size, 1), MAX_PAGE_SIZE)
    rows = query.offset(offset).limit(size + 1).all()
    has_more = len(rows) > size
    page = rows[:size]
    next_token = encode_page_token(offset + size) if has_more else None
    return page, next_token


def paginate_keyset_by_created(
    query: Any,
    *,
    model: Any,
    page_size: int,
    page_token: str | None,
    sort: str = "newest",
) -> tuple[list[Any], str | None]:
    """Keyset page on (created_at, id). Sort: newest | oldest."""
    size = min(max(page_size, 1), MAX_PAGE_SIZE)
    cursor = decode_keyset_token(page_token)
    descending = (sort or "newest").strip().lower() not in (
        "oldest",
        "created_asc",
    )

    created_col = model.created_at
    id_col = model.id

    if cursor and cursor.get("created_at") is not None:
        c_at = cursor["created_at"]
        c_id = cursor["id"]
        try:
            c_uuid = UUID(str(c_id))
        except (ValueError, TypeError) as exc:
            raise HTTPException(
                status_code=400, detail="Invalid page_token"
            ) from exc
        if descending:
            # created_at DESC, id ASC
            query = query.filter(
                or_(
                    created_col < c_at,
                    and_(created_col == c_at, id_col > c_uuid),
                )
            )
        else:
            query = query.filter(
                or_(
                    created_col > c_at,
                    and_(created_col == c_at, id_col > c_uuid),
                )
            )

    if descending:
        query = query.order_by(created_col.desc(), id_col.asc())
    else:
        query = query.order_by(created_col.asc(), id_col.asc())

    rows = query.limit(size + 1).all()
    has_more = len(rows) > size
    page = rows[:size]
    if not has_more or not page:
        return page, None
    last = page[-1]
    return page, encode_keyset_token(
        created_at=getattr(last, "created_at", None),
        row_id=getattr(last, "id"),
        sort="oldest" if not descending else "newest",
    )
