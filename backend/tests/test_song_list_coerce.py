"""Cheer song-list edits must not be packed away by empty Dance cover aliases."""

from app.api.orders import _coerce_dance_cover_fields


def test_empty_cover_aliases_keep_cheer_song_list():
    data = {
        "song_list_suggestions": "Edited song list",
        "power_music_covers": "",
        "unleash_the_beats_covers": "",
    }
    _coerce_dance_cover_fields(data, unset_ok=True)
    assert data["song_list_suggestions"] == "Edited song list"
    assert "power_music_covers" not in data
    assert "unleash_the_beats_covers" not in data


def test_clearing_dance_covers_clears_a_dance_pack():
    data = {
        "song_list_suggestions": (
            "Power Music Covers:\nOld\n\nUnleash the Beats Covers:\n"
        ),
        "power_music_covers": "",
        "unleash_the_beats_covers": "",
    }
    _coerce_dance_cover_fields(data, unset_ok=True)
    assert data["song_list_suggestions"] is None


def test_dance_cover_edit_still_packs():
    data = {
        "song_list_suggestions": "leftover cheer text",
        "power_music_covers": "Track A",
        "unleash_the_beats_covers": "",
    }
    _coerce_dance_cover_fields(data, unset_ok=True)
    assert "Track A" in data["song_list_suggestions"]
    assert "Power Music Covers:" in data["song_list_suggestions"]
