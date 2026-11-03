"""Fetch Magento form results and forward them to the Vercel ingest API."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Callable

from magento_poller.config import PollerConfig
from magento_poller.http_client import (
    HttpStatusError,
    TransientNetworkError,
    extract_results,
    request_json,
)

logger = logging.getLogger("slt.magento_poller")

SKIP_KEYS = (
    "skipped_cutoff",
    "skipped_duplicate",
    "skipped_form_mismatch",
    "skipped_unroutable",
    "skipped_missing_result_id",
)


@dataclass
class FormSummary:
    form_id: int
    fetched: int = 0
    batches: int = 0
    created: int = 0
    skipped: int = 0
    failed: bool = False
    error: str = ""


@dataclass
class PollSummary:
    forms: list[FormSummary] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return all(not item.failed for item in self.forms)


def chunked(items: list[dict[str, Any]], size: int) -> list[list[dict[str, Any]]]:
    return [items[index : index + size] for index in range(0, len(items), size)]


def fetch_form_results(config: PollerConfig, form_id: int) -> list[dict[str, Any]]:
    url = f"{config.wf_base}/V1/webforms/form/{form_id}/results"
    payload = request_json(
        "GET",
        url,
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {config.wf_access_token}",
            "User-Agent": "slt-magento-poll/1.0",
        },
        timeout=config.timeout_seconds,
        max_attempts=config.max_attempts,
    )
    return extract_results(payload)


def forward_batch(
    config: PollerConfig,
    form_id: int,
    results: list[dict[str, Any]],
) -> dict[str, Any]:
    payload = request_json(
        "POST",
        config.ingest_url,
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Magento-Ingest-Secret": config.ingest_secret,
            "User-Agent": "slt-magento-poll/1.0",
        },
        body={"form_id": form_id, "results": results},
        timeout=config.timeout_seconds,
        max_attempts=config.max_attempts,
    )
    if not isinstance(payload, dict):
        raise ValueError("ingest response was not an object")
    if "received" not in payload or "created" not in payload:
        raise ValueError("ingest response missing summary fields")
    return payload


def _skipped_total(payload: dict[str, Any]) -> int:
    return sum(int(payload.get(key) or 0) for key in SKIP_KEYS)


def run_poll(config: PollerConfig) -> PollSummary:
    summary = PollSummary()
    for form_id in config.form_ids:
        form_summary = FormSummary(form_id=form_id)
        summary.forms.append(form_summary)
        try:
            results = fetch_form_results(config, form_id)
        except (HttpStatusError, TransientNetworkError, ValueError) as exc:
            form_summary.failed = True
            form_summary.error = _public_error(exc)
            logger.error("Form %s fetch failed: %s", form_id, form_summary.error)
            continue

        form_summary.fetched = len(results)
        if not results:
            logger.info("Form %s: no submissions", form_id)
            continue

        batches = chunked(results, config.batch_size)
        form_summary.batches = len(batches)
        for index, batch in enumerate(batches, start=1):
            try:
                response = forward_batch(config, form_id, batch)
            except (HttpStatusError, TransientNetworkError, ValueError) as exc:
                form_summary.failed = True
                form_summary.error = _public_error(exc)
                logger.error(
                    "Form %s batch %s/%s failed: %s",
                    form_id,
                    index,
                    len(batches),
                    form_summary.error,
                )
                continue
            created = int(response.get("created") or 0)
            skipped = _skipped_total(response)
            form_summary.created += created
            form_summary.skipped += skipped
            logger.info(
                "Form %s batch %s/%s received=%s created=%s skipped=%s",
                form_id,
                index,
                len(batches),
                response.get("received"),
                created,
                skipped,
            )
        logger.info(
            "Form %s done fetched=%s batches=%s created=%s skipped=%s failed=%s",
            form_id,
            form_summary.fetched,
            form_summary.batches,
            form_summary.created,
            form_summary.skipped,
            form_summary.failed,
        )
    return summary


def _public_error(exc: Exception) -> str:
    if isinstance(exc, HttpStatusError):
        return f"HTTP {exc.status}"
    if isinstance(exc, TransientNetworkError):
        return "network error"
    return "invalid response"


def main(argv: list[str] | None = None, loader: Callable[[], PollerConfig] | None = None) -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )
    del argv
    try:
        config = (loader or _load_default)()
    except Exception as exc:
        logger.error("Configuration error: %s", exc)
        return 2
    summary = run_poll(config)
    if summary.ok:
        logger.info("Poll finished successfully")
        return 0
    logger.error("Poll finished with failures")
    return 1


def _load_default() -> PollerConfig:
    from magento_poller.config import load_config

    return load_config()
