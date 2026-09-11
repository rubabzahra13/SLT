import uuid

from app.lib.producer_assignment import resolve_producer_by_assignment_key
from app.models.producer import Producer


def _seed_producer(db, *, initials: str, name: str) -> Producer:
    producer = Producer(
        id=uuid.uuid4(),
        name=name,
        initials=initials,
        email=f"{initials.lower()}@example.com",
        specialty="Cheer",
        categories=["All-Star Cheer"],
    )
    db.add(producer)
    db.commit()
    return producer


def test_resolve_producer_by_assignment_key_matches_initials_name_and_legacy(db):
    casey = _seed_producer(db, initials="CM", name="Casey Miller")

    assert resolve_producer_by_assignment_key(db, "CM").id == casey.id
    assert resolve_producer_by_assignment_key(db, "CASEY").id == casey.id
    assert resolve_producer_by_assignment_key(db, "Casey Miller").id == casey.id


def test_resolve_producer_by_assignment_key_ignores_first_available(db):
    _seed_producer(db, initials="CM", name="Casey Miller")

    assert resolve_producer_by_assignment_key(db, "FA") is None
    assert resolve_producer_by_assignment_key(db, "") is None
