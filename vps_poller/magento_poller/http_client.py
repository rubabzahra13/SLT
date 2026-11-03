"""Small urllib JSON client with bounded retries."""

from __future__ import annotations

import json
import logging
import time
import urllib.error
import urllib.request
from typing import Any, Callable

logger = logging.getLogger("slt.magento_poller")

SleepFn = Callable[[float], None]


class HttpStatusError(Exception):
    def __init__(self, status: int, detail: str) -> None:
        super().__init__(f"HTTP {status}")
        self.status = status
        self.detail = detail[:200]

    @property
    def retryable(self) -> bool:
        return self.status == 429 or self.status >= 500


class TransientNetworkError(Exception):
    """Network failure that may succeed on retry."""


def extract_results(payload: Any) -> list[dict[str, Any]]:
    """Match backend extract_results: list or items/results/data."""
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if isinstance(payload, dict):
        for key in ("items", "results", "data"):
            items = payload.get(key)
            if isinstance(items, list):
                return [item for item in items if isinstance(item, dict)]
    raise ValueError("WebForms results payload was not a list")


def request_json(
    method: str,
    url: str,
    *,
    headers: dict[str, str],
    body: dict[str, Any] | None = None,
    timeout: int = 120,
    max_attempts: int = 4,
    sleep: SleepFn = time.sleep,
) -> Any:
    """JSON request with exponential backoff on network errors and 429/5xx.

    401, 403, and other 4xx responses fail immediately.
    """
    payload = None if body is None else json.dumps(body).encode("utf-8")
    last_error: Exception | None = None
    attempts = max(1, max_attempts)
    for attempt in range(1, attempts + 1):
        request = urllib.request.Request(
            url,
            data=payload,
            headers=headers,
            method=method,
        )
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                raw = response.read().decode("utf-8", "replace")
            if not raw.strip():
                return None
            return json.loads(raw)
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", "replace")
            error = HttpStatusError(exc.code, detail)
            last_error = error
            if not error.retryable or attempt >= attempts:
                raise error
            delay = 2 ** (attempt - 1)
            logger.warning(
                "HTTP %s from %s (attempt %s/%s); retrying in %ss",
                exc.code,
                _safe_url(url),
                attempt,
                attempts,
                delay,
            )
            sleep(delay)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            if isinstance(exc, json.JSONDecodeError):
                raise ValueError("response was not JSON") from exc
            last_error = TransientNetworkError(str(exc.reason if isinstance(exc, urllib.error.URLError) else exc))
            if attempt >= attempts:
                raise last_error
            delay = 2 ** (attempt - 1)
            logger.warning(
                "Network error calling %s (attempt %s/%s); retrying in %ss",
                _safe_url(url),
                attempt,
                attempts,
                delay,
            )
            sleep(delay)
    raise last_error or RuntimeError("request failed")


def _safe_url(url: str) -> str:
    """Drop query strings so tokens never appear in logs."""
    return url.split("?", 1)[0]
