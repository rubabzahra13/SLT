"""Local development seeding.

Ensures the sample users used by the frontend's offline login fallback exist
in the database, so their bearer tokens (``token-<user_id>``) authenticate
against the backend. Without this, endpoints guarded by authentication (such as
the Gmail connect/send routes) would reject the default local session.
"""
import logging

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User

logger = logging.getLogger(__name__)

# Mirrors SAMPLE_USERS / SAMPLE_PASSWORDS in src/context/AuthContext.tsx
SAMPLE_USERS = [
    {
        "id": "usr-megan",
        "name": "Megan",
        "email": "megan@soundslikethat.com",
        "password": "admin",
        "access_level": "Full Access",
    },
    {
        "id": "usr-andrea",
        "name": "Andrea",
        "email": "apetty@powermusic.com",
        "password": "admin",
        "access_level": "Full Access",
    },
    {
        "id": "usr-lori",
        "name": "Lori",
        "email": "lori@powermusic.com",
        "password": "view",
        "access_level": "View Only",
    },
    {
        "id": "usr-dan",
        "name": "Dan",
        "email": "dan@powermusic.com",
        "password": "view",
        "access_level": "View Only",
    },
    {
        "id": "usr-steve",
        "name": "Steve",
        "email": "steve@powermusic.com",
        "password": "view",
        "access_level": "View Only",
    },
]


def seed_sample_users(db: Session) -> None:
    """Insert any missing sample users. Idempotent."""
    created = 0
    for entry in SAMPLE_USERS:
        existing = db.query(User).filter(User.id == entry["id"]).first()
        if existing:
            continue
        db.add(
            User(
                id=entry["id"],
                name=entry["name"],
                email=entry["email"],
                hashed_password=hash_password(entry["password"]),
                access_level=entry["access_level"],
                is_active=True,
            )
        )
        created += 1

    if created:
        db.commit()
        logger.info("Seeded %d sample user(s) for local development.", created)
