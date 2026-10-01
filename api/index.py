"""Vercel Python entrypoint.

Boot a tiny FastAPI app first so /api/health can report import failures as JSON
instead of an opaque Next.js 500 HTML page.
"""
import sys
import os
import traceback

backend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi import FastAPI
from fastapi.responses import JSONResponse

_boot = FastAPI(title="SLT API boot")
_import_error: dict | None = None


@_boot.get("/health")
@_boot.get("/api/health")
@_boot.get("/")
@_boot.get("/api")
@_boot.get("/api/index")
async def boot_health():
    if _import_error:
        return JSONResponse(status_code=500, content=_import_error)
    return {"status": "ok", "database": "not-loaded", "python": True}


try:
    from app.main import app as _real_app
    app = _real_app
except Exception as exc:  # pragma: no cover
    _import_error = {
        "error": "Backend failed to import",
        "detail": str(exc),
        "type": exc.__class__.__name__,
        "traceback": traceback.format_exc().splitlines()[-16:],
        "backend_dir": backend_dir,
        "backend_exists": os.path.isdir(backend_dir),
        "sys_path_head": sys.path[:5],
    }
    app = _boot
