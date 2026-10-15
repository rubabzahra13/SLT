"""Stable UUIDs for idempotent seed upserts (replaces legacy_id keys)."""
from __future__ import annotations

import uuid

# Fixed namespace so re-seeding the same key yields the same UUID.
SEED_NAMESPACE = uuid.UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890")


def seed_uuid(kind: str, key: str) -> uuid.UUID:
    return uuid.uuid5(SEED_NAMESPACE, f"{kind}:{key.strip()}")
