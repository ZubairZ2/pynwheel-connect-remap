"""Small helpers that reproduce Ruby / Rails semantics the CMS relies on."""
from __future__ import annotations

import json
import re
from typing import Any


def present(value: Any) -> bool:
    """ActiveSupport `present?`: nil/false, blank strings and empty collections are not present; everything else is."""
    if value is None or value is False:
        return False
    if isinstance(value, str):
        return value.strip() != ""
    if isinstance(value, (list, tuple, dict, set)):
        return len(value) > 0
    return True


def presence(value: Any) -> Any:
    return value if present(value) else None


def to_i(value: Any) -> int:
    """Ruby `String#to_i` / `nil.to_i`: the leading integer, else 0."""
    if value is None:
        return 0
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    m = re.match(r"\s*([+-]?\d+)", str(value))
    return int(m.group(1)) if m else 0


def to_f(value: Any) -> float:
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    m = re.match(r"\s*([+-]?\d+(?:\.\d+)?)", str(value))
    return float(m.group(1)) if m else 0.0


def product_options(raw: Any) -> dict[str, Any]:
    """`Connect::ProductState.options`: the jsonb column holds a JSON *string*, so it is parsed twice."""
    try:
        if isinstance(raw, str):
            raw = json.loads(raw)
        if isinstance(raw, str):
            raw = json.loads(raw)
    except (ValueError, TypeError):
        return {}
    return raw if isinstance(raw, dict) else {}


def option_enabled(raw: Any, key: str) -> bool:
    options = product_options(raw)
    try:
        return present(options["product_options"][key]["is_enabled"])
    except (KeyError, TypeError):
        return False


def tour_enabled(self_tour: Any, raw_product_options: Any) -> bool:
    """`Connect::ProductState.tour?`: the `self_tour` column OR the Launch order form."""
    return present(self_tour) or option_enabled(raw_product_options, "self_tour")


def humanize(value: str) -> str:
    """ActiveSupport `humanize` as far as the graph uses it on node kinds (`tour_start` → "Tour start")."""
    text = re.sub(r"_id$", "", value).replace("_", " ").strip()
    return text[:1].upper() + text[1:] if text else text


def natural_sort_key(name: str) -> str:
    """`Community#fetch_building_list`: numbers zero-padded to 8 digits, then plain string order."""
    return re.sub(r"\d+", lambda m: "%08d" % int(m.group(0)), name)


_TAG = re.compile(r"<[^>]+>")
_BREAK = re.compile(r"<\s*(br|/p|/div|/li|/tr)\b[^>]*>", re.I)


def strip_html(value: Any) -> str | None:
    """Plain text from the CMS's rich-text fields (`directional_text` holds HTML).
    Tags go, line breaks become spaces, entities are decoded, whitespace collapses."""
    if value is None:
        return None
    import html

    text = _BREAK.sub(" ", str(value))
    text = _TAG.sub("", text)
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text or None
