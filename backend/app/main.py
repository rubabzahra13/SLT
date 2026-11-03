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
    # Schema is owned by Alembic. Never run DDL on Vercel cold starts -
    # it adds multi-second latency and fights the connection pooler.
    if os.getenv("VERCEL"):
        yield
        return

    # Local / SQLite: create tables and apply lightweight column patches.
    if USING_SQLITE_FALLBACK or not os.getenv("VERCEL"):
        try:
            Base.metadata.create_all(bind=engine)
        except Exception as exc:
            logger.warning("Skipping create_all during startup: %s", exc)

    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            if engine.dialect.name == "sqlite":
                # Phase 5: collection/email live on Orders only: do not re-add on mtd_records.
                for stmt in (
                    "ALTER TABLE orders ADD COLUMN is_reassigned BOOLEAN DEFAULT 0",
                    "ALTER TABLE orders ADD COLUMN collection_states TEXT",
                    "ALTER TABLE orders ADD COLUMN order_status VARCHAR",
                    "ALTER TABLE orders ADD COLUMN missing_data_email_sent_at DATETIME",
                    "ALTER TABLE orders ADD COLUMN producer_email_sent_at DATETIME",
                    "ALTER TABLE orders ADD COLUMN producer_email_sent_to VARCHAR",
                ):
                    try:
                        conn.execute(text(stmt))
                    except Exception:
                        pass
            else:
                conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_reassigned BOOLEAN DEFAULT FALSE;"))
                # Phase 4-5: assignment/collection live on Orders only: do not re-add on mtd_records.
                conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS collection_states JSON;"))
                conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_status VARCHAR;"))
                conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS missing_data_email_sent_at TIMESTAMPTZ;"))
                conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS producer_email_sent_at TIMESTAMPTZ;"))
                conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS producer_email_sent_to VARCHAR;"))
                conn.execute(text("ALTER TABLE producers ADD COLUMN IF NOT EXISTS max_producer_cost_per_day INTEGER;"))
    except Exception as exc:
        logger.warning("Auto-migration check skipped/failed: %s", exc)

    if USING_SQLITE_FALLBACK:
        from app.core.seed import seed_sample_users

        db = SessionLocal()
        try:
            seed_sample_users(db)
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("Failed to seed sample users: %s", exc)
        finally:
            db.close()

    try:
        from sqlalchemy import text

        with engine.begin() as conn:
            if engine.dialect.name == "sqlite":
                for stmt in (
                    "ALTER TABLE orders ADD COLUMN school_gym_billing_address_line_2 TEXT",
                    "ALTER TABLE orders ADD COLUMN magento_form_id VARCHAR",
                    "ALTER TABLE orders ADD COLUMN magento_result_id VARCHAR",
                    "ALTER TABLE orders ADD COLUMN contact_phone_for_youth_rec_cheer VARCHAR",
                ):
                    try:
                        conn.execute(text(stmt))
                    except Exception:
                        pass
            else:
                conn.execute(text(
                    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS school_gym_billing_address_line_2 TEXT;"
                ))
                conn.execute(text(
                    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS magento_form_id VARCHAR;"
                ))
                conn.execute(text(
                    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS magento_result_id VARCHAR;"
                ))
                conn.execute(text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_magento_result_id ON orders (magento_result_id);"
                ))
                conn.execute(text(
                    "CREATE INDEX IF NOT EXISTS ix_orders_magento_form_id ON orders (magento_form_id);"
                ))
                conn.execute(text(
                    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS contact_phone_for_youth_rec_cheer VARCHAR;"
                ))
                conn.execute(text(
                    """
                    CREATE TABLE IF NOT EXISTS magento_poll_cursor (
                        id INTEGER PRIMARY KEY,
                        import_after TIMESTAMPTZ NOT NULL
                    )
                    """
                ))
    except Exception as exc:
        logger.warning("Magento intake columns were not added: %s", exc)

    magento_stop = None
    try:
        from app.services.magento_poll import start_magento_poller

        # Use uvicorn's console logger: app.* INFO is often invisible locally.
        logging.getLogger("uvicorn.error").info(
            "Starting Magento poller (enabled=%s forms=%s interval=%ss token=%s)",
            settings.MAGENTO_POLL_ENABLED,
            settings.MAGENTO_POLL_FORM_IDS,
            settings.MAGENTO_POLL_INTERVAL_SECONDS,
            "set" if (settings.WF_ACCESS_TOKEN or "").strip() else "MISSING",
        )
        magento_stop = start_magento_poller()
    except Exception as exc:
        logging.getLogger("uvicorn.error").warning(
            "Magento poller did not start: %s", exc
        )

    yield

    try:
        from app.services.magento_poll import stop_magento_poller

        await stop_magento_poller(magento_stop)
    except Exception as exc:
        logger.warning("Magento poller shutdown failed: %s", exc)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

from fastapi import Request, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
import traceback

def _cors_headers(request: Request) -> dict:
    origin = request.headers.get("origin", "*")
    return {
        "Access-Control-Allow-Origin": origin
        if origin in settings.CORS_ORIGINS or "vercel.app" in origin
        else "*",
        "Access-Control-Allow-Credentials": "true",
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Never swallow FastAPI/Starlette HTTP errors into opaque 500s.
    if isinstance(exc, (HTTPException, StarletteHTTPException)):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=_cors_headers(request),
        )
    if isinstance(exc, RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={"detail": exc.errors()},
            headers=_cors_headers(request),
        )
    logger.error(f"Unhandled exception on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "detail": str(exc),
            "type": exc.__class__.__name__,
            "path": str(request.url),
            "traceback": traceback.format_exc().splitlines()[-6:],
        },
        headers=_cors_headers(request),
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
