"""Vercel Python serverless entrypoint for /api/*.

Next.js serves the UI; this FastAPI app handles /api/* on the same deployment.
"""
from __future__ import annotations

import os
import sys
import traceback

backend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    from app.main import app
except Exception as exc:  # pragma: no cover
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse

    app = FastAPI(title="SLT API boot failure")
    _payload = {
        "error": "Backend failed to import",
        "detail": str(exc),
        "type": type(exc).__name__,
        "traceback": traceback.format_exc().splitlines()[-20:],
        "backend_dir": backend_dir,
        "backend_exists": os.path.isdir(backend_dir),
    }

    @app.api_route(
        "/{full_path:path}",
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    )
    async def import_failure(full_path: str = ""):
        return JSONResponse(status_code=500, content=_payload)
