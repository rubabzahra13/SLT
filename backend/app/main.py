import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, SessionLocal, USING_SQLITE_FALLBACK
from app.models import Base
from app.api import api_router

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Skip DDL on Vercel/serverless with Postgres — schema is managed via Alembic on Supabase.
    # Create tables if running against SQLite fallback.
    if USING_SQLITE_FALLBACK or not os.getenv("VERCEL"):
        try:
            Base.metadata.create_all(bind=engine)
        except Exception as exc:
            logger.warning("Skipping create_all during startup: %s", exc)

    # When running against the local SQLite fallback, seed the sample users so
    # the frontend's offline session tokens authenticate.
    if USING_SQLITE_FALLBACK:
        from app.core.seed import seed_sample_users

        db = SessionLocal()
        try:
            seed_sample_users(db)
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("Failed to seed sample users: %s", exc)
        finally:
            db.close()

    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

from fastapi import Request
from fastapi.responses import JSONResponse
import traceback

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "detail": str(exc),
            "type": exc.__class__.__name__,
            "path": str(request.url),
            "traceback": traceback.format_exc().splitlines()[-6:]
        }
    )

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True)
