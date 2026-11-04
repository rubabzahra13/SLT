"""Single SSE fan-out for board (orders/MTD) + producer events."""
from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.api.auth import get_stream_user
from app.models.user import User
from app.services.board_events import board_event_hub
from app.services.producer_events import producer_event_hub

router = APIRouter()


@router.get("/studio/stream")
async def stream_studio(_: User = Depends(get_stream_user)):
    """Authenticated SSE multiplexing order/MTD + producer change events."""
    board_queue = board_event_hub.subscribe()
    producer_queue = producer_event_hub.subscribe()

    async def event_generator():
        try:
            yield f"event: ready\ndata: {json.dumps({'ok': True})}\n\n"
            while True:
                board_task = asyncio.create_task(board_queue.get())
                producer_task = asyncio.create_task(producer_queue.get())
                done, pending = await asyncio.wait(
                    {board_task, producer_task},
                    timeout=25.0,
                    return_when=asyncio.FIRST_COMPLETED,
                )
                for task in pending:
                    task.cancel()
                    try:
                        await task
                    except asyncio.CancelledError:
                        pass
                if not done:
                    yield ": keepalive\n\n"
                    continue
                for task in done:
                    try:
                        event = task.result()
                    except Exception:
                        continue
                    event_type = str(event.get("type") or "message")
                    yield (
                        f"event: {event_type}\n"
                        f"data: {json.dumps(event, default=str)}\n\n"
                    )
        finally:
            board_event_hub.unsubscribe(board_queue)
            producer_event_hub.unsubscribe(producer_queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
