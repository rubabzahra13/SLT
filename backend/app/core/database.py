import logging
import os
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import NullPool
from app.core.config import settings

logger = logging.getLogger(__name__)

# The live API engine uses the transaction pooler (port 6543) when available;
# Alembic keeps using get_database_url() (session/direct) for safe DDL.
db_url = settings.get_runtime_database_url()


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

if db_url:
    if os.getenv("VERCEL"):
        # Serverless: one short-lived connection per invocation, no client pool.
        engine = create_engine(
            db_url,
            poolclass=NullPool,
            pool_pre_ping=True,
            connect_args=_PG_CONNECT_ARGS,
        )
    else:
        # Long-running server: a small, hard-bounded, self-healing pool.
        # Total connections per process are capped at pool_size + max_overflow,
        # kept well under Supabase's client limit even across a few processes.
        engine = create_engine(
            db_url,
            pool_pre_ping=True,       # drop dead connections before handing them out
            pool_size=_int_env("DB_POOL_SIZE", 5),
            max_overflow=_int_env("DB_MAX_OVERFLOW", 5),
            pool_timeout=_int_env("DB_POOL_TIMEOUT", 10),
            pool_recycle=_int_env("DB_POOL_RECYCLE", 300),  # recycle every 5 min
            connect_args=_PG_CONNECT_ARGS,
        )
    USING_SQLITE_FALLBACK = False
else:
    # Local development fallback: file-based SQLite so the backend can run
    # without a configured Supabase/Postgres database. This is what enables
    # the local Google/Gmail connection and email-sending flow to work end
    # to end even when DATABASE_URL is not set.
    logger.warning(
        "No DATABASE_URL configured. Falling back to local SQLite database "
        "(local_dev.db). This is intended for local development only."
    )
    engine = create_engine(
        "sqlite:///./local_dev.db",
        connect_args={"check_same_thread": False},
    )
    USING_SQLITE_FALLBACK = True

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
