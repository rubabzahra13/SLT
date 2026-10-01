import logging
import os
from typing import Generator, Optional
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import NullPool
from app.core.config import settings

logger = logging.getLogger(__name__)

# The live API engine uses the transaction pooler (port 6543) when available;
# Alembic keeps using get_database_url() (session/direct) for safe DDL.
db_url = settings.get_runtime_database_url()

_engine: Optional[Engine] = None
_engine_error: Optional[str] = None
USING_SQLITE_FALLBACK = False


def _int_env(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


# Server-side guards so a stuck query/transaction can never hold a pooled
# backend indefinitely (which is what leaks connections toward the pool cap).
_PG_CONNECT_ARGS = {
    "connect_timeout": 10,
    "application_name": "slt-backend",
    # Reap half-open TCP connections instead of letting them occupy a slot.
    "keepalives": 1,
    "keepalives_idle": 30,
    "keepalives_interval": 10,
    "keepalives_count": 5,
    "options": (
        "-c statement_timeout=30000 "
        "-c idle_in_transaction_session_timeout=30000"
    ),
}


def _build_engine() -> Engine:
    global USING_SQLITE_FALLBACK, _engine_error
    url = settings.get_runtime_database_url()
    if url:
        USING_SQLITE_FALLBACK = False
        _engine_error = None
        if os.getenv("VERCEL"):
            # Serverless: one short-lived connection per invocation, no client pool.
            return create_engine(
                url,
                poolclass=NullPool,
                pool_pre_ping=True,
                connect_args=_PG_CONNECT_ARGS,
            )
        # Long-running server: a small, hard-bounded, self-healing pool.
        return create_engine(
            url,
            pool_pre_ping=True,
            pool_size=_int_env("DB_POOL_SIZE", 5),
            max_overflow=_int_env("DB_MAX_OVERFLOW", 5),
            pool_timeout=_int_env("DB_POOL_TIMEOUT", 10),
            pool_recycle=_int_env("DB_POOL_RECYCLE", 300),
            connect_args=_PG_CONNECT_ARGS,
        )

    if os.getenv("VERCEL"):
        # Never silently fall back to ephemeral SQLite on Vercel — writes would vanish.
        # Delay the hard failure until a request needs the DB so /health can still boot
        # and report a clear misconfiguration instead of an opaque platform 500.
        _engine_error = (
            "DATABASE_URL is not configured on Vercel. "
            "Set DATABASE_URL (or RUNTIME_DATABASE_URL) to the Supabase pooler URL."
        )
        logger.error(_engine_error)
        USING_SQLITE_FALLBACK = False
        # Placeholder engine; get_db/health will surface _engine_error.
        return create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
        )

    # Local development fallback: file-based SQLite so the backend can run
    # without a configured Supabase/Postgres database.
    logger.warning(
        "No DATABASE_URL configured. Falling back to local SQLite database "
        "(local_dev.db). This is intended for local development only."
    )
    USING_SQLITE_FALLBACK = True
    _engine_error = None
    return create_engine(
        "sqlite:///./local_dev.db",
        connect_args={"check_same_thread": False},
    )


engine = _build_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db_config_error() -> Optional[str]:
    return _engine_error


def get_db() -> Generator:
    if _engine_error:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=_engine_error,
        )
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
