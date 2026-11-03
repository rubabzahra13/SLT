"""Machine-to-machine Magento WebForms ingest for the Lightsail VPS poller."""

from __future__ import annotations

import logging
import secrets
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.order import Order
from app.services.magento_orders import (
    MagentoIngestStatus,
    ensure_import_cutoff,
    ingest_magento_result,
)

logger = logging.getLogger("uvicorn.error")

router = APIRouter()

# Dedicated header so VPS auth never collides with admin Bearer user tokens.
INGEST_SECRET_HEADER = "X-Magento-Ingest-Secret"


class MagentoIngestRequest(BaseModel):
    form_id: int = Field(..., ge=1, description="Magento WebForms form id")
    results: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Raw Magento /results objects for this form",
    )


class MagentoIngestItemOutcome(BaseModel):
    result_id: Optional[str] = None
    status: MagentoIngestStatus
    message: Optional[str] = None


class MagentoIngestResponse(BaseModel):
    form_id: int
    received: int
    created: int
    skipped_cutoff: int
    skipped_duplicate: int
    skipped_form_mismatch: int
    skipped_unroutable: int
    skipped_missing_result_id: int
    created_result_ids: List[str]
    items: List[MagentoIngestItemOutcome]


def require_magento_ingest_secret(
    x_magento_ingest_secret: Optional[str] = Header(
        default=None, alias=INGEST_SECRET_HEADER
    ),
) -> None:
    """Validate the VPS shared secret without using admin session tokens."""
    expected = (settings.MAGENTO_INGEST_SECRET or "").strip()
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Magento ingest is not configured",
        )
    provided = (x_magento_ingest_secret or "").strip()
    if not provided or not secrets.compare_digest(provided, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid ingest credentials",
        )


@router.post(
    "/magento/ingest",
    response_model=MagentoIngestResponse,
    status_code=status.HTTP_200_OK,
)
def ingest_magento_batch(
    payload: MagentoIngestRequest,
    db: Session = Depends(get_db),
    _: None = Depends(require_magento_ingest_secret),
) -> MagentoIngestResponse:
    """Accept a batch of Magento results from the Lightsail poller."""
    cutoff = ensure_import_cutoff(db)
    known: set[str] = {
        row[0]
        for row in db.query(Order.magento_result_id)
        .filter(Order.magento_result_id.isnot(None))
        .all()
    }

    counts: Dict[MagentoIngestStatus, int] = {
        "created": 0,
        "skipped_cutoff": 0,
        "skipped_duplicate": 0,
        "skipped_form_mismatch": 0,
        "skipped_unroutable": 0,
        "skipped_missing_result_id": 0,
    }
    created_result_ids: List[str] = []
    items: List[MagentoIngestItemOutcome] = []

    for result in payload.results:
        if not isinstance(result, dict):
            items.append(
                MagentoIngestItemOutcome(
                    result_id=None,
                    status="skipped_unroutable",
                    message="result must be an object",
                )
            )
            counts["skipped_unroutable"] += 1
            continue

        outcome = ingest_magento_result(
            db,
            payload.form_id,
            result,
            cutoff=cutoff,
            known_result_ids=known,
            publish_board_event=True,
        )
        if outcome.result_id and outcome.status in (
            "created",
            "skipped_duplicate",
        ):
            known.add(outcome.result_id)
        if outcome.status == "created" and outcome.result_id:
            created_result_ids.append(outcome.result_id)

        counts[outcome.status] = counts.get(outcome.status, 0) + 1
        items.append(
            MagentoIngestItemOutcome(
                result_id=outcome.result_id,
                status=outcome.status,
                message=outcome.message,
            )
        )

    logger.info(
        "Magento ingest form=%s received=%s created=%s cutoff=%s dup=%s",
        payload.form_id,
        len(payload.results),
        counts["created"],
        counts["skipped_cutoff"],
        counts["skipped_duplicate"],
    )

    return MagentoIngestResponse(
        form_id=payload.form_id,
        received=len(payload.results),
        created=counts["created"],
        skipped_cutoff=counts["skipped_cutoff"],
        skipped_duplicate=counts["skipped_duplicate"],
        skipped_form_mismatch=counts["skipped_form_mismatch"],
        skipped_unroutable=counts["skipped_unroutable"],
        skipped_missing_result_id=counts["skipped_missing_result_id"],
        created_result_ids=created_result_ids,
        items=items,
    )
