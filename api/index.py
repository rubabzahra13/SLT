import sys
import os
import traceback

# Add backend directory to sys.path so app modules can be imported
backend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    from app.main import app
except Exception as exc:  # pragma: no cover - surfaces import failures on Vercel
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse

    app = FastAPI()

    @app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"])
    async def import_failure(full_path: str):
        return JSONResponse(
            status_code=500,
            content={
                "error": "Backend failed to import",
                "detail": str(exc),
                "type": exc.__class__.__name__,
                "traceback": traceback.format_exc().splitlines()[-12:],
            },
        )
