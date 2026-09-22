import uuid

from app.lib.producer_assignment import resolve_producer_by_assignment_key
from app.models.producer import Producer


def _get_or_create_producer(db, *, initials: str, name: str) -> Producer:
    existing = db.query(Producer).filter(Producer.initials == initials).first()
    if existing:
        return existing
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
    casey = _get_or_create_producer(db, initials="CM", name="Casey Miller")

    assert resolve_producer_by_assignment_key(db, "CM").id == casey.id
    assert resolve_producer_by_assignment_key(db, "CASEY").id == casey.id


def test_resolve_producer_by_assignment_key_ignores_first_available(db):
    _get_or_create_producer(db, initials="CM", name="Casey Miller")

    assert resolve_producer_by_assignment_key(db, "FA") is None
    assert resolve_producer_by_assignment_key(db, "") is None


def test_find_producer_matches_various_identifiers(db):
    from app.api.producers import _find_producer

    riley = _get_or_create_producer(db, initials="RL", name="Riley Test")
    riley.legacy_id = "prod-10"
    db.commit()

    assert _find_producer(db, str(riley.id)).id == riley.id
    assert _find_producer(db, "prod-10").id == riley.id
    assert _find_producer(db, "10").id == riley.id
    assert _find_producer(db, "Riley Test").id == riley.id
    assert _find_producer(db, "RL").id == riley.id


