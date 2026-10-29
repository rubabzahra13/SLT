"""Google AIP-135 delete helpers — 404 by default, allow_missing no-op."""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException, Query, status


def allow_missing_query(
    allow_missing: bool = Query(
        False,
        description=(
            "AIP-135: when true, deleting an already-absent resource succeeds "
            "as a no-op (204) instead of 404 NOT_FOUND."
        ),
    ),
) -> bool:
    return allow_missing


def missing_or_found(
    resource: Any,
    *,
    allow_missing: bool,
    detail: str,
) -> bool:
    """Return True when the resource is missing and the caller opted into no-op.

    Raises 404 NOT_FOUND when missing and allow_missing is false.
    """
    if resource is not None:
        return False
    if allow_missing:
        return True
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)
