"""Vercel FastAPI entrypoint for the api service (backend/)."""
from __future__ import annotations

import traceback

try:
    from app.main import app
except Exception as exc:  # pragma: no cover - surfaces deploy/import failures
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse

    app = FastAPI(title="SLT API boot failure")
    _payload = {
        "error": "Backend failed to import",
        "detail": str(exc),
        "type": type(exc).__name__,
        "traceback": traceback.format_exc().splitlines()[-20:],
    }

    @app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"])
    async def import_failure(full_path: str = ""):
        return JSONResponse(status_code=500, content=_payload)
