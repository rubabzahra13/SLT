"""Local interval poller for Magento order forms.

Started with the FastAPI process. Interval is MAGENTO_POLL_INTERVAL_SECONDS.
Vercel does not run this loop; a cron can call the same sync later.

Soft under load: each form gets its own short DB session, Magento HTTP runs
with no DB connection held, and a small gap between forms lets board/counts
requests borrow the pool.
"""

from __future__ import annotations

import asyncio
import logging

from app.core.config import settings
from app.services.board_events import board_event_hub
from app.services.magento_orders import configured_poll_form_ids, sync_one_form

# uvicorn.error is wired to the console; app.* loggers often are not.
logger = logging.getLogger("uvicorn.error")

_task: asyncio.Task | None = None


async def _loop(stop: asyncio.Event) -> None:
    interval = max(15, int(settings.MAGENTO_POLL_INTERVAL_SECONDS or 180))
    # Yield between forms so a 12-form tick does not monopolize the pool.
    form_gap = max(0.0, float(getattr(settings, "MAGENTO_POLL_FORM_GAP_SECONDS", 0.75) or 0.75))
    forms = settings.MAGENTO_POLL_FORM_IDS
    logger.info(
        "Magento poller started (forms=%s, every %ss, form_gap=%ss)",
        forms,
        interval,
        form_gap,
    )
    while not stop.is_set():
        form_ids = configured_poll_form_ids()
        logger.info("Magento poll tick starting (%s forms)", len(form_ids))
        created_total = 0
        try:
            for i, form_id in enumerate(form_ids):
                if stop.is_set():
                    break
                batch = await asyncio.to_thread(sync_one_form, form_id)
                created_total += len(batch)
                for order in batch:
                    board_event_hub.publish({"type": "order.updated", "order": order})
                    logger.info(
                        "Magento order streamed result_id=%s form_id=%s subtype=%s",
                        order.get("magento_result_id"),
                        order.get("magento_form_id"),
                        order.get("cheer_form_subtype")
                        or order.get("dance_form_subtype")
                        or order.get("form_type"),
                    )
                # Pause between forms (not after the last) so user API work can run.
                if form_gap > 0 and i < len(form_ids) - 1 and not stop.is_set():
                    try:
                        await asyncio.wait_for(stop.wait(), timeout=form_gap)
                        break
                    except asyncio.TimeoutError:
                        pass
            logger.info(
                "Magento poll tick finished: %s new order(s)",
                created_total,
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
        "Magento poller task scheduled (forms=%s, interval=%ss, form_gap=%ss)",
        settings.MAGENTO_POLL_FORM_IDS,
        max(15, int(settings.MAGENTO_POLL_INTERVAL_SECONDS or 180)),
        max(0.0, float(getattr(settings, "MAGENTO_POLL_FORM_GAP_SECONDS", 0.75) or 0.75)),
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
