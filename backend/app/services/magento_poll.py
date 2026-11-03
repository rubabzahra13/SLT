"""Local interval poller for Magento order forms.

Started with the FastAPI process. Interval is MAGENTO_POLL_INTERVAL_SECONDS.
Vercel does not run this loop; a cron can call the same sync later.
"""

from __future__ import annotations

import asyncio
import logging

from app.core.config import settings
from app.core.database import SessionLocal
from app.services.board_events import board_event_hub
from app.services.magento_orders import sync_configured_forms

# uvicorn.error is wired to the console; app.* loggers often are not.
logger = logging.getLogger("uvicorn.error")

_task: asyncio.Task | None = None


def _sync_once() -> list[dict]:
    db = SessionLocal()
    try:
        return sync_configured_forms(db)
    finally:
        db.close()


async def _loop(stop: asyncio.Event) -> None:
    interval = max(15, int(settings.MAGENTO_POLL_INTERVAL_SECONDS or 120))
    forms = settings.MAGENTO_POLL_FORM_IDS
    logger.info(
        "Magento poller started (forms=%s, every %ss)",
        forms,
        interval,
    )
    while not stop.is_set():
        logger.info("Magento poll tick starting (forms=%s)", forms)
        try:
            created = await asyncio.to_thread(_sync_once)
            logger.info(
                "Magento poll tick finished: %s new order(s)",
                len(created),
            )
            for order in created:
                board_event_hub.publish({"type": "order.updated", "order": order})
                logger.info(
                    "Magento order streamed result_id=%s form_id=%s subtype=%s",
                    order.get("magento_result_id"),
                    order.get("magento_form_id"),
                    order.get("cheer_form_subtype")
                    or order.get("dance_form_subtype")
                    or order.get("form_type"),
                )
        except Exception:
            logger.exception("Magento poll failed")
        logger.info("Magento poller sleeping %ss", interval)
        try:
            await asyncio.wait_for(stop.wait(), timeout=interval)
        except asyncio.TimeoutError:
            continue


def start_magento_poller() -> asyncio.Event | None:
    global _task
    if not settings.MAGENTO_POLL_ENABLED:
        logger.info("Magento poller disabled (MAGENTO_POLL_ENABLED=false)")
        return None
    if not (settings.WF_ACCESS_TOKEN or "").strip():
        logger.warning("Magento poller not started: WF_ACCESS_TOKEN is empty")
        return None
    stop = asyncio.Event()
    _task = asyncio.create_task(_loop(stop), name="magento-poller")
    logger.info(
        "Magento poller task scheduled (forms=%s, interval=%ss)",
        settings.MAGENTO_POLL_FORM_IDS,
        max(15, int(settings.MAGENTO_POLL_INTERVAL_SECONDS or 120)),
    )
    return stop


async def stop_magento_poller(stop: asyncio.Event | None) -> None:
    global _task
    if stop is not None:
        stop.set()
    if _task is not None:
        _task.cancel()
        try:
            await _task
        except asyncio.CancelledError:
            pass
        _task = None
        logger.info("Magento poller stopped")
