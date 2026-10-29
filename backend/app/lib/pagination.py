"""AIP-158-style offset page tokens for list methods."""

from __future__ import annotations

import base64
import json
from typing import Any, Sequence, TypeVar

from fastapi import HTTPException, Query

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


def decode_page_token(page_token: str | None) -> int:
    """Return the 0-based offset encoded in page_token (0 if absent)."""
    if not page_token:
        return 0
    try:
        raw = base64.urlsafe_b64decode(page_token.encode("ascii") + b"===")
        payload = json.loads(raw.decode("utf-8"))
        offset = int(payload.get("o", 0))
        if offset < 0:
            raise ValueError("negative offset")
        return offset
    except Exception as exc:  # noqa: BLE001: invalid client token
        raise HTTPException(status_code=400, detail="Invalid page_token") from exc


def encode_page_token(offset: int) -> str:
    raw = json.dumps({"o": offset}, separators=(",", ":")).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


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
