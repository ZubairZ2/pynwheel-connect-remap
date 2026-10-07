"""A port of `Wayfinding::RouteService`: routes over `GraphBuilder.build()`,
from one place to another or the whole tour (start -> visible stops in tour
order -> back). Dijkstra over the per-floor copies; the answer is a list of
legs (one per floor walked, with the centre-pixel points along each path's
polyline) and the floor / building transitions between them, plus the steps
`timing` phrases. Errors use the taxonomy of the Connect router so the
preview, the Rails API and the Tour App say the same thing.

Two additions for the Tour App (not in the Ruby): `tour(stop_keys=...)`
routes a chosen subset of the tour's stops (ordered by the same rule) and
returns the per-stop segments; `distances(targets)` measures the route from
the tour start to each target over one built graph.
"""
from __future__ import annotations

import heapq
import math
from dataclasses import dataclass, field
from typing import Any

from .graph_builder import LEGACY_STOP_TYPES
from .models import Copy, Graph, Node, Point
from . import timing


@dataclass
class Leg:
    index: int
    kind: str
    level_key: str | None
    floor: int | None
    building: str | None
    frm: str
    to: str
    length_px: float
    points: list[Point]
    nodes: list[str]
    via: str | None = None
    floor_from: int | None = None
    floor_to: int | None = None
    name: str | None = None


@dataclass
class Result:
    ok: bool
    frm: str | None
    to: str | None
    legs: list[Leg]
    steps: list[dict[str, Any]]
    length_px: float
    length_ft: float | None
    duration_s: int | None
    warnings: list[str]
    error: dict[str, Any] | None
    graph: Graph
    segments: list["Segment"] | None = None


@dataclass
class Segment:
    node_key: str
    tour_stop: dict[str, Any] | None
    frm: str
    result: Result


@dataclass
class Distance:
    node_key: str
    ok: bool
    length_px: float
    length_ft: float | None
    duration_s: int | None
    direction: str
    error: dict[str, Any] | None = None


ERRORS = {
    "unknown_endpoint": "That place is not on the map.",
    "same_endpoint": "Pick two different places.",
    "ambiguous_floor": "Say which floor to start on.",
    "not_linked": "%(name)s is not connected to a path on %(where)s.",
    "no_path": "No path connects those two places.",
    "blocked": "Every path between those places is cut by a blocker%(where)s.",
    "no_step_free": "No step-free route: every way between those floors uses stairs.",
    "no_vertical_link": "Nothing links those floors. Add an elevator or stairs that serves both.",
    "no_building_link": "Nothing links building %(a)s to building %(b)s. Add an entry or exit point to each.",
    "no_start": "The tour has no starting point on the map.",
    "invalid_stop": "%(name)s is not a stop of this tour.",
}

STOP_TYPE_KEYS = {"unit": "unit", "amenity": "amenity", "elevator": "elevator", "building_starting_point": "bsp"}


class RouteService:
    def __init__(self, graph: Graph, *, from_key: str | None = None, to_key: str | None = None, from_floor: Any = None, to_floor: Any = None, open_graph: Graph | None = None):
        """`graph` is built with the wanted step_free / avoid_blockers; `open_graph`
        (same options but avoid_blockers=False) is used to diagnose `blocked`."""
        self.graph = graph
        self.frm = from_key
        self.to = to_key
        self.from_floor = from_floor
        self.to_floor = to_floor
        self._open_graph = open_graph

    # ------------------------------------------------------------- public
    def call(self) -> Result:
        a = self._resolve(self.frm, self.from_floor)
        b = self._resolve(self.to, self.to_floor)
        if a == "unknown" or b == "unknown":
            return self._failure("unknown_endpoint", frm=self.frm, to=self.to)
        if a == "ambiguous" or b == "ambiguous":
            return self._failure("ambiguous_floor", frm=self.frm, to=self.to)
        if a == b:
            return self._failure("same_endpoint", frm=self.frm, to=self.to)
        return self._route_between(a, b, frm=self.frm or "", to=self.to or "")

    def tour(self, stop_keys: list[str] | None = None) -> Result:
        """The whole tour: start -> every visible stop in tour order -> start.
        With `stop_keys`, only those stops (every key must be a visible, mapped
        stop of the tour, else `invalid_stop`)."""
        g = self.graph
        start = next((k for k in g.nodes if k.startswith("tour_start:")), None)
        if start is None:
            return self._failure("no_start", frm=None, to=None)
        rows = self._ordered_tour_stops()
        if stop_keys is not None:
            wanted = set(stop_keys)
            known = {row["node"].key for row in rows}
            unknown = [k for k in stop_keys if k not in known]
            if unknown:
                return self._failure("invalid_stop", frm=start, to=None, name=", ".join(unknown), details={"invalid_stops": unknown})
            # A stop listed twice in `tour_stops` (legacy duplicates) is visited once: the first row in tour order.
            seen: set[str] = set()
            rows = [row for row in rows if row["node"].key in wanted and not (row["node"].key in seen or seen.add(row["node"].key))]
        start_copy = self._copy_of(g.nodes[start], None)
        if not isinstance(start_copy, str):
            return self._failure("no_start", frm=None, to=None)
        sequence: list[tuple[str, dict[str, Any] | None]] = [(start_copy, None)] + [(row["copy"], row) for row in rows] + [(start_copy, None)]
        legs: list[Leg] = []
        steps: list[dict[str, Any]] = []
        warnings: list[str] = []
        segments: list[Segment] = []
        length = 0.0
        duration = 0.0
        duration_known = True
        for (from_copy, _), (to_copy, stop_row) in zip(sequence, sequence[1:]):
            from_node = g.node(from_copy).node
            to_node = g.node(to_copy).node
            partial = self._route_between(from_copy, to_copy, frm=from_node.key, to=to_node.key)
            if not partial.ok:
                warnings.append(f"{partial.error['message']} ({from_node.name} → {to_node.name})")
                continue
            offset = len(legs)
            for leg in partial.legs:
                leg.index += offset
            legs.extend(partial.legs)
            for step in partial.steps:
                step["leg"] += offset
            steps.extend(partial.steps)
            length += partial.length_px
            if partial.duration_s is None:
                duration_known = False
            else:
                duration += partial.duration_s
            if stop_row is None:
                # The return to the start: kept as a segment without a tour stop so the whole tour's steps can be assembled.
                segments.append(Segment(node_key=to_node.key, tour_stop=None, frm=from_node.key, result=partial))
                continue
            dwell = (stop_row["tour_stop"].get("duration_minutes") or 0) * 60
            if steps and steps[-1]["kind"] == "arrive":
                steps[-1]["dwell_s"] = dwell
            duration += dwell
            segments.append(Segment(node_key=to_node.key, tour_stop=stop_row["tour_stop"], frm=from_node.key, result=partial))
        if not legs:
            return self._failure("no_path", frm=start, to=start, warnings=warnings)
        # The Ruby sums `partial.duration_s.to_f` (nil -> 0); the Tour App needs to know when it is unknown.
        return Result(ok=True, frm=start, to=start, legs=legs, steps=steps, length_px=round(length, 1), length_ft=self._feet(legs), duration_s=int(round(duration)) if duration_known else None, warnings=warnings, error=None, graph=g, segments=segments)

    def distances(self, targets: list[str]) -> dict[str, Distance]:
        """From the tour start to each target over one graph."""
        g = self.graph
        start = next((k for k in g.nodes if k.startswith("tour_start:")), None)
        out: dict[str, Distance] = {}
        start_copy = self._copy_of(g.nodes[start], None) if start else "unknown"
        for target in targets:
            if not isinstance(start_copy, str):
                out[target] = Distance(target, False, 0.0, None, None, "level", {"code": "no_start", "message": ERRORS["no_start"]})
                continue
            resolved = self._resolve(target, None)
            if resolved == "unknown":
                out[target] = Distance(target, False, 0.0, None, None, "level", {"code": "unknown_endpoint", "message": ERRORS["unknown_endpoint"]})
                continue
            if resolved == "ambiguous":
                out[target] = Distance(target, False, 0.0, None, None, "level", {"code": "ambiguous_floor", "message": ERRORS["ambiguous_floor"]})
                continue
            if resolved == start_copy:
                out[target] = Distance(target, True, 0.0, 0.0, 0, "level")
                continue
            result = self._route_between(start_copy, resolved, frm=start or "", to=target)
            if not result.ok:
                out[target] = Distance(target, False, 0.0, None, None, "level", result.error)
                continue
            up = any(l.kind not in ("walk", "outdoor") and (l.floor_to or 0) > (l.floor_from or 0) for l in result.legs)
            down = any(l.kind not in ("walk", "outdoor") and (l.floor_to or 0) < (l.floor_from or 0) for l in result.legs)
            out[target] = Distance(target, True, result.length_px, result.length_ft, result.duration_s, "up" if up else "down" if down else "level")
        return out

    # ------------------------------------------------------------ helpers
    def _failure(self, code: str, *, frm: str | None, to: str | None, warnings: list[str] | None = None, details: Any = None, **params: str) -> Result:
        values = {"name": "", "where": "", "a": "", "b": ""}
        values.update(params)
        message = ERRORS[code] % values
        error: dict[str, Any] = {"code": code, "message": message, "fix": None}
        if details is not None:
            error["details"] = details
        return Result(ok=False, frm=frm, to=to, legs=[], steps=[], length_px=0, length_ft=None, duration_s=None, warnings=warnings or [], error=error, graph=self.graph)

    def _resolve(self, ref: str | None, floor: Any) -> str:
        instances = self.graph.instances(str(ref or ""))
        if not instances:
            return "unknown"
        return self._copy_of(instances, floor)

    def _copy_of(self, node_or_instances: Node | list[Node], floor: Any) -> str:
        g = self.graph
        instances = node_or_instances if isinstance(node_or_instances, list) else [node_or_instances]
        copies: list[str] = []
        for node in instances:
            level = g.level(node.level_key)
            for f in (level.copies if level else [None]):
                key = g.copy_key(node.key, node.level_key, f)
                if key in g.copy_nodes:
                    copies.append(key)
        if not copies:
            return "unknown"
        if len(copies) == 1:
            return copies[0]
        if floor is not None and str(floor).strip() != "":
            wanted = int(str(floor).strip())
            for key in copies:
                copy = g.copy_nodes[key]
                level = g.level(copy.level_key)
                if copy.floor == wanted or (level is not None and level.floors == [wanted]):
                    return key
            return "unknown"
        own = list(dict.fromkeys(g.copy_key(n.key, n.level_key, n.floor) for n in instances if n.floor is not None))
        if len(own) == 1 and own[0] in g.copy_nodes:
            return own[0]
        return "ambiguous"

    def _ordered_tour_stops(self) -> list[dict[str, Any]]:
        g = self.graph
        building_index = {b: i for i, b in enumerate(g.buildings)}
        rows: list[dict[str, Any]] = []
        for ts in g.tour_stops:
            if ts.get("display_stop") is False or ts.get("stop_type") not in LEGACY_STOP_TYPES:
                continue
            key = STOP_TYPE_KEYS.get(ts["stop_type"])
            node = g.nodes.get(f"{key}:{ts['stop_id']}") if key else None
            if node is None or node.kind == "elevator":
                continue
            copy = self._copy_of(node, None)
            if copy in ("unknown", "ambiguous"):
                continue
            level = g.level(node.level_key)
            floor = node.floor if node.floor is not None else (level.floors[0] if level and level.floors else 0)
            rows.append({"tour_stop": ts, "node": node, "copy": copy, "building": building_index.get(node.building, 0), "floor": floor, "sort": ts["sort"] if ts.get("sort") is not None else 1 << 30})
        rows.sort(key=lambda r: (r["building"], r["floor"], r["sort"], r["tour_stop"]["id"]))
        return rows

    def _place_name(self, copy: Copy) -> str:
        level = self.graph.level(copy.level_key)
        name = "the property map" if level and level.kind == "sitemap" else ((level.record.get("name") or level.key) if level else copy.level_key)
        return f"Floor {copy.floor} ({name})" if copy.floor is not None else name

    def _route_between(self, a: str, b: str, *, frm: str, to: str) -> Result:
        g = self.graph
        for copy in (g.node(a), g.node(b)):
            if copy.node.kind == "hallway" or copy.linked:
                continue
            return self._failure("not_linked", frm=frm, to=to, name=str(copy.node.name or ""), where=self._place_name(copy))
        found = self._dijkstra(a, b)
        if not found:
            return self._diagnose(a, b, frm, to)
        return self._legs_from_path(found, frm, to)

    def route_between_public(self, a: str, b: str, frm: str, to: str) -> Result:
        return self._route_between(a, b, frm=frm, to=to)

    def _diagnose(self, a: str, b: str, frm: str, to: str) -> Result:
        g = self.graph
        na = g.node(a)
        nb = g.node(b)
        if g.avoid_blockers and any(n.kind == "blocker" for n in g.nodes.values()) and self._open_graph is not None:
            open_service = RouteService(self._open_graph)
            if a in self._open_graph.copy_nodes and b in self._open_graph.copy_nodes and open_service.route_between_public(a, b, frm, to).ok:
                return self._failure("blocked", frm=frm, to=to, where="")
        same_floor = na.level_key == nb.level_key and na.floor == nb.floor
        if not same_floor:
            ba = na.node.building
            bb = nb.node.building
            all_edges = g.all_edges()
            if ba and bb and ba != bb and not any(e.kind == "outdoor" for e in all_edges):
                return self._failure("no_building_link", frm=frm, to=to, a=ba, b=bb)
            verticals = sum(1 for e in all_edges if e.kind in ("elevator", "stairs", "ramp"))
            if g.step_free and verticals == 0 and any(n.vertical == "stairs" for n in g.nodes.values()):
                return self._failure("no_step_free", frm=frm, to=to)
            if verticals == 0:
                return self._failure("no_vertical_link", frm=frm, to=to)
            if g.step_free:
                return self._failure("no_step_free", frm=frm, to=to)
        return self._failure("no_path", frm=frm, to=to)

    def _dijkstra(self, source: str, target: str) -> dict[str, Any] | None:
        g = self.graph
        dist: dict[str, float] = {source: 0.0}
        prev: dict[str, str] = {}
        via: dict[str, Any] = {}
        heap: list[tuple[float, int, str]] = [(0.0, 0, source)]
        counter = 1
        while heap:
            d, _, u = heapq.heappop(heap)
            if d > dist.get(u, math.inf):
                continue
            if u == target:
                break
            for edge in g.edges_of(u):
                alt = d + edge.weight
                if alt < dist.get(edge.to, math.inf):
                    dist[edge.to] = alt
                    prev[edge.to] = u
                    via[edge.to] = edge
                    heapq.heappush(heap, (alt, counter, edge.to))
                    counter += 1
        if target not in dist:
            return None
        path = [target]
        while path[0] in prev:
            path.insert(0, prev[path[0]])
        return {"path": path, "via": via, "length": dist[target]}

    def _floor_of(self, copy: Copy) -> int | None:
        if copy.floor is not None:
            return copy.floor
        level = self.graph.level(copy.level_key)
        return level.floors[0] if level and level.floors else None

    def _new_leg(self, index: int, copy: Copy) -> Leg:
        node = copy.node
        return Leg(index=index, kind="walk", level_key=copy.level_key, floor=self._floor_of(copy), building=node.building, frm=node.key, to=node.key, length_px=0.0, points=[(copy.x, copy.y)], nodes=[node.key])

    def _legs_from_path(self, found: dict[str, Any], frm: str, to: str) -> Result:
        g = self.graph
        path: list[str] = found["path"]
        via = found["via"]
        legs: list[Leg] = []
        leg = self._new_leg(0, g.node(path[0]))
        for key in path[1:]:
            edge = via[key]
            copy = g.node(key)
            if edge.kind in ("walk", "link"):
                line = edge.polyline if edge.polyline is not None else [(g.node(edge.frm).x, g.node(edge.frm).y), (copy.x, copy.y)]
                if len(line) > 1:
                    leg.points.extend(line[1:])
                leg.length_px += edge.weight
                leg.nodes.append(copy.node.key)
                leg.to = copy.node.key
                continue
            legs.append(leg)
            legs.append(Leg(index=len(legs), kind=edge.kind, level_key=None, floor=None, building=None, frm=leg.to, to=copy.node.key, length_px=0.0, points=[], nodes=[], via=copy.node.key, floor_from=self._floor_of(g.node(edge.frm)), floor_to=self._floor_of(copy), name=edge.name))
            leg = self._new_leg(len(legs), copy)
        legs.append(leg)
        length = sum(l.length_px for l in legs)
        return Result(ok=True, frm=frm, to=to, legs=legs, steps=timing.steps(legs, g), length_px=round(length, 1), length_ft=self._feet(legs), duration_s=timing.duration(legs, g), warnings=[], error=None, graph=g)

    def _feet(self, legs: list[Leg]) -> float | None:
        total = 0.0
        for leg in legs:
            if leg.kind != "walk":
                continue
            scale = timing.scale_of(leg, self.graph)
            if scale is None:
                return None
            total += leg.length_px * scale
        return round(total, 1)
