"""Environment configuration for the VPS Magento poller."""

from __future__ import annotations

import os
from dataclasses import dataclass


class ConfigError(ValueError):
    """Missing or invalid poller configuration."""


@dataclass(frozen=True)
class PollerConfig:
    wf_base: str
    wf_access_token: str
    ingest_url: str
    ingest_secret: str
    form_ids: tuple[int, ...]
    batch_size: int
    timeout_seconds: int = 120
    max_attempts: int = 4


def _required(source: dict[str, str], name: str) -> str:
    value = (source.get(name) or "").strip()
    if not value:
        raise ConfigError(f"{name} is required")
    return value


def parse_form_ids(raw: str) -> tuple[int, ...]:
    parts = [part.strip() for part in raw.split(",")]
    ids: list[int] = []
    for part in parts:
        if not part:
            continue
        if not part.isdigit():
            raise ConfigError(f"MAGENTO_POLL_FORM_IDS contains invalid id {part!r}")
        form_id = int(part)
        if form_id < 1:
            raise ConfigError(f"MAGENTO_POLL_FORM_IDS contains invalid id {part!r}")
        if form_id not in ids:
            ids.append(form_id)
    if not ids:
        raise ConfigError("MAGENTO_POLL_FORM_IDS must list at least one form id")
    return tuple(ids)


def load_config(environ: dict[str, str] | None = None) -> PollerConfig:
    source = dict(os.environ if environ is None else environ)
    batch_raw = (source.get("MAGENTO_BATCH_SIZE") or "50").strip()
    try:
        batch_size = int(batch_raw)
    except ValueError as exc:
        raise ConfigError("MAGENTO_BATCH_SIZE must be a positive integer") from exc
    if batch_size < 1:
        raise ConfigError("MAGENTO_BATCH_SIZE must be a positive integer")
    return PollerConfig(
        wf_base=_required(source, "WF_BASE").rstrip("/"),
        wf_access_token=_required(source, "WF_ACCESS_TOKEN"),
        ingest_url=_required(source, "MAGENTO_INGEST_URL"),
        ingest_secret=_required(source, "MAGENTO_INGEST_SECRET"),
        form_ids=parse_form_ids(_required(source, "MAGENTO_POLL_FORM_IDS")),
        batch_size=batch_size,
    )
