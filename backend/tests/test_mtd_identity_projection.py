"""Order-SoT projection for MTD API responses (Phases 3-5)."""

from types import SimpleNamespace
from unittest.mock import patch

from app.services.mtd_identity import identity_from_order, order_projection_for_mtd


def test_identity_from_order_prefers_package_type_when_package_empty():
    order = SimpleNamespace(
        form_type="marching-band",
        contact_name=None,
        coach_name="Test Coach",
        customer_name=None,
        package=None,
        package_type="FIGHT SONG PLUS",
        music_theme=None,
        editor_initials="FA",
        school_gym_name="Demo Band",
        merged_form_order_id=None,
    )
    identity = identity_from_order(order)
    assert identity["contact_name"] == "Test Coach"
    assert identity["program_name"] == "Demo Band"
    assert identity["package"] == "FIGHT SONG PLUS"
    assert identity["category"] == "Marching Band"


def test_identity_falls_back_to_linked_form_school_gym_name():
    booking = SimpleNamespace(
        form_type="marching-band",
        contact_name=None,
        coach_name="Test",
        customer_name=None,
        package=None,
        package_type="FIGHT SONG PLUS",
        music_theme=None,
        editor_initials="FA",
        school_gym_name=None,
        merged_form_order_id="form-id",
    )
    form = SimpleNamespace(
        form_type="marching-band",
        contact_name="Demo Band Coach",
        coach_name="Demo Band Coach",
        customer_name="Demo Band Coach",
        package="BAND CHANT",
        package_type="BAND CHANT",
        music_theme=None,
        editor_initials="FA",
        school_gym_name="March School",
        merged_form_order_id=None,
    )
    with patch(
        "app.services.mtd_identity._linked_form_order", return_value=form
    ):
        identity = identity_from_order(booking)
    assert identity["program_name"] == "March School"
    assert identity["package"] == "FIGHT SONG PLUS"
    assert identity["contact_name"] == "Test"


def test_order_projection_includes_assignment_from_order():
    order = SimpleNamespace(
        form_type="school-all-star-cheer",
        contact_name="Coach",
        coach_name=None,
        customer_name=None,
        package="GOLD 2:30",
        package_type=None,
        music_theme="Theme",
        editor_initials="FA",
        school_gym_name="Alpha Gym",
        merged_form_order_id=None,
        assigned_producer_id=None,
        assigned_producer="CP",
        mix_start_date="2026-10-18",
        mix_end_date="2026-10-20",
        is_reassigned=False,
        received_eight_count_sheet="HAVE CS",
        have_songs="HAVE SONGS",
        collection_states=None,
        order_status="Complete",
        needs_attention=False,
        missing_data_email_sent_at=None,
        producer_email_sent_at=None,
        producer_email_sent_to=None,
    )
    projected = order_projection_for_mtd(order)
    assert projected["package"] == "GOLD 2:30"
    assert projected["assigned_producer"] == "CP"
    assert projected["mix_start_date"].isoformat() == "2026-10-18"
    assert projected["have_songs"] == "HAVE SONGS"
