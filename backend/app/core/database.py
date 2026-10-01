import logging
import os
from typing import Generator, Optional
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import NullPool
from app.core.config import settings

logger = logging.getLogger(__name__)

_engine: Optional[Engine] = None
_SessionLocal: Optional[sessionmaker] = None
_engine_error: Optional[str] = None
USING_SQLITE_FALLBACK = False

Base = declarative_base()


def _int_env(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


_PG_CONNECT_ARGS = {
    "connect_timeout": 10,
    "application_name": "slt-backend",
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
            return create_engine(
                url,
                poolclass=NullPool,
                pool_pre_ping=True,
                connect_args=_PG_CONNECT_ARGS,
            )
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
        _engine_error = (
            "DATABASE_URL is not configured on Vercel. "
            "Set DATABASE_URL (or RUNTIME_DATABASE_URL) to the Supabase pooler URL."
        )
        logger.error(_engine_error)
        USING_SQLITE_FALLBACK = False
        return create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
        )

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


def get_engine() -> Engine:
    """Lazy engine init so a bad DB driver/URL cannot crash module import."""
    global _engine, _SessionLocal, _engine_error
    if _engine is not None:
        return _engine
    try:
        _engine = _build_engine()
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
    except Exception as exc:
        _engine_error = f"Failed to create database engine: {exc}"
        logger.exception(_engine_error)
        _engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
        )
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
    return _engine


# Back-compat for `from app.core.database import engine`
class _EngineProxy:
    def __getattr__(self, name: str):
        return getattr(get_engine(), name)

    def begin(self, *args, **kwargs):
        return get_engine().begin(*args, **kwargs)

    def connect(self, *args, **kwargs):
        return get_engine().connect(*args, **kwargs)

    def dispose(self, *args, **kwargs):
        return get_engine().dispose(*args, **kwargs)

    @property
    def dialect(self):
        return get_engine().dialect

    @property
    def url(self):
        return get_engine().url


engine = _EngineProxy()


class _SessionLocalProxy:
    """Callable session factory that initializes the engine on first use."""

    def __call__(self, *args, **kwargs):
        get_engine()
        assert _SessionLocal is not None
        return _SessionLocal(*args, **kwargs)


SessionLocal = _SessionLocalProxy()


def get_db_config_error() -> Optional[str]:
    get_engine()
    return _engine_error


def get_db() -> Generator:
    get_engine()
    if _engine_error:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=_engine_error,
        )
    assert _SessionLocal is not None
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()
