import logging
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

logger = logging.getLogger(__name__)

db_url = settings.get_database_url()

if db_url:
    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
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
