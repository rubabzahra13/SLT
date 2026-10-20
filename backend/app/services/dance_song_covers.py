"""Dance Magento Power Music + Unleash covers → song_list_suggestions pack."""

from __future__ import annotations

import re
from typing import Optional, Tuple

_POWER_RE = re.compile(
    r"Power Music Covers:\s*\n?(.*?)(?=\n\s*Unleash the Beats Covers:|$)",
    re.IGNORECASE | re.DOTALL,
)
_UNLEASH_RE = re.compile(
    r"Unleash the Beats Covers:\s*\n?(.*)\Z",
    re.IGNORECASE | re.DOTALL,
)


def pack_dance_song_covers(
    power: Optional[str], unleash: Optional[str]
) -> str:
    p = (power or "").strip()
    u = (unleash or "").strip()
    if not p and not u:
        return ""
    return f"Power Music Covers:\n{p}\n\nUnleash the Beats Covers:\n{u}"


def parse_dance_song_covers(raw: Optional[str]) -> Tuple[str, str]:
    text = (raw or "").strip()
    if not text:
        return "", ""
    if (
        "Power Music Covers:" not in text
        and "power music covers:" not in text.lower()
        and "Unleash the Beats Covers:" not in text
        and "unleash the beats covers:" not in text.lower()
    ):
        return "", ""
    power_m = _POWER_RE.search(text)
    unleash_m = _UNLEASH_RE.search(text)
    return (
        (power_m.group(1).strip() if power_m else ""),
        (unleash_m.group(1).strip() if unleash_m else ""),
    )
