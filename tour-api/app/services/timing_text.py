"""Names and places as the Rails `Wayfinding::Timing` phrases them."""
from __future__ import annotations

from ..repositories.rubyisms import humanize, presence
from ..wayfinding.models import Graph, Node


def name_of(node: Node | None, key: str | None = None) -> str:
    if node is not None and presence(node.name):
        return str(node.name)
    source = node.key if node is not None else (key or "")
    return humanize(source.split(":")[0]) if source else ""


def place_name(graph: Graph, level_key: str | None, floor: int | None) -> str:
    level = graph.level(level_key)
    if level is not None and level.kind == "sitemap":
        return "Property map"
    if floor is not None:
        return f"Floor {floor}"
    if level is not None and presence(level.record.get("name")):
        return str(level.record["name"])
    return "the floor"
