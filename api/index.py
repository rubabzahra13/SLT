import sys
import os
import traceback
from fastapi import FastAPI
from fastapi.responses import JSONResponse

# Add backend directory to sys.path so app modules can be imported
backend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    from app.main import app
except Exception as init_exc:
    tb_str = traceback.format_exc()
    exc_str = str(init_exc)
    exc_type = init_exc.__class__.__name__

    fallback_app = FastAPI(title="Initialization Error Handler")

    @fallback_app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"])
    async def catch_all(path: str):
        return JSONResponse(
            status_code=500,
            content={
                "error": "Backend Initialization Error",
                "type": exc_type,
                "detail": exc_str,
                "traceback": tb_str.splitlines()[-15:]
            }
        )

    app = fallback_app
