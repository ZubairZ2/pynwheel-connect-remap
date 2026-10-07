"""A port of `Wayfinding::Timing`: the steps a route reads out and the time it
takes. Walking speed 4.4 ft/s where a level has a scale; an elevator ride
30 + 8 s per floor; stairs 15 s per floor. Pixels are only converted to feet
when a `scale_ft_per_px` is stored; nothing is assumed."""
from __future__ import annotations

from typing import Any

from ..repositories.rubyisms import humanize, presence, to_f
from .models import Graph

WALK_FT_PER_S = 4.4


def floors_between(leg: Any) -> int:
    if leg.floor_from is None or leg.floor_to is None:
        return 1
    return max(1, abs(leg.floor_to - leg.floor_from))


def scale_of(leg: Any, graph: Graph) -> float | None:
    level = graph.level(leg.level_key)
    scale = level.record.get("scale_ft_per_px") if level else None
    return to_f(scale) if scale is not None and to_f(scale) > 0 else None


def place(leg: Any, graph: Graph) -> str:
    level = graph.level(leg.level_key)
    if level and level.kind == "sitemap":
        return "the property map"
    if leg.floor is not None:
        return f"Floor {leg.floor}"
    return presence(level.record.get("name")) if level else None or "the floor"


def name_of(node: Any) -> str:
    if node is not None and presence(node.name):
        return node.name
    return humanize(node.key.split(":")[0]) if node is not None else ""


def duration(legs: list[Any], graph: Graph) -> int | None:
    total = 0.0
    for leg in legs:
        if leg.kind == "walk":
            scale = scale_of(leg, graph)
            if scale is None:
                return None
            total += leg.length_px * scale / WALK_FT_PER_S
        elif leg.kind in ("elevator", "ramp"):
            total += 30 + 8 * floors_between(leg)
        elif leg.kind == "stairs":
            total += 15 * floors_between(leg)
        elif leg.kind == "outdoor":
            return None
    return int(round(total))


def steps(legs: list[Any], graph: Graph) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for leg in legs:
        if leg.kind == "walk":
            if len(leg.points) < 2 and len(legs) > 1:
                continue
            destination = graph.nodes.get(leg.to)
            scale = scale_of(leg, graph)
            distance = f"{int(round(leg.length_px * scale))} ft" if scale else f"{int(round(leg.length_px))} px"
            out.append({"kind": "walk", "leg": leg.index, "title": f"Walk to {name_of(destination)}", "sub": f"{distance} on {place(leg, graph)}"})
        elif leg.kind in ("elevator", "stairs", "ramp"):
            floors = floors_between(leg)
            direction = "Down" if leg.floor_to is not None and leg.floor_from is not None and leg.floor_to < leg.floor_from else "Up"
            verb = "Take the stairs" if leg.kind == "stairs" else "Take the ramp" if leg.kind == "ramp" else f"Take {leg.name}"
            out.append({"kind": leg.kind, "leg": leg.index, "title": f"{verb} to Floor {leg.floor_to}", "sub": f"{direction} {floors} {'floor' if floors == 1 else 'floors'}"})
        elif leg.kind == "outdoor":
            parts = (leg.name or "").split("|")
            out_name = parts[0] if parts else ""
            in_name = parts[1] if len(parts) > 1 else ""
            out.append({"kind": "outdoor", "leg": leg.index, "title": f"Walk outside to {name_of(graph.nodes.get(leg.to))}", "sub": f"Leave by {out_name}, enter by {in_name}"})
    if legs:
        last = legs[-1]
        destination = graph.nodes.get(last.to)
        out.append({"kind": "arrive", "leg": last.index, "title": f"Arrive at {name_of(destination)}", "sub": (presence(destination.note) if destination else None) or place(last, graph)})
    return out
