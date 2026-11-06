"""Category rate lookup uses the producer row, including display labels."""
from decimal import Decimal
from types import SimpleNamespace

from app.services.compensation import _determine_rate_for_subtype


def test_pom_subtype_uses_producer_label_rate():
    producer = SimpleNamespace(
        rates_by_category={"Pom": 0.7, "All-Star Cheer": 0.7}
    )
    rate, source = _determine_rate_for_subtype(producer, "pom")
    assert rate == Decimal("0.7")
    assert source == "rates_by_category[Pom]"

    cheer_rate, cheer_source = _determine_rate_for_subtype(
        producer, "all-star-cheer"
    )
    assert cheer_rate == Decimal("0.7")
    assert cheer_source == "rates_by_category[All-Star Cheer]"


def test_exact_subtype_key_still_wins():
    producer = SimpleNamespace(rates_by_category={"jazz-kick": 0.72})
    rate, source = _determine_rate_for_subtype(producer, "jazz-kick")
    assert rate == Decimal("0.72")
    assert source == "rates_by_category[jazz-kick]"
