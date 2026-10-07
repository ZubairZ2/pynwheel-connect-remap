"""A port of `Wayfinding::GraphBuilder` (app/services/wayfinding/graph_builder.rb).

One routable graph for a whole property, built from the persisted rows the
way Connect's Wayfinding mode and the legacy `ShortestPath` read them:

- every level (a Floorplate, or the Sitemap) contributes its routable hallway
  nodes and their links; a stacked floorplate ("1-6") is one layout shared by
  its floors, so each floor is a copy of the same nodes and links;
- plotted units and amenities join the graph at their door when they have
  one, else at their pin, at the nearest routable node unless a
  `hallway_attachments` row names another node or says "detached";
- elevators (any kind) stand on every floor they serve and are linked floor
  to floor (step-free routes skip stairs and inaccessible connectors);
  building entry/exit points, the tour's own start and entry/exit stops are
  gates, linked between buildings by one outdoor edge;
- blockers cut the hallway links that pass within their radius.

Weights are floor-image pixels; a floor change weighs what the design weighs
it in its 760x470 plan (elevator 50 + 10*floors, stairs 90*floors, outdoor
500), scaled to the level's diagonal. Coordinates are centres (legacy icon
records are stored top-left; +8 is applied on read). Read-only.

Every rule here mirrors the Ruby line for line; the parity harness
(scripts/parity.py) checks the result against the Rails API on real data.
"""
from __future__ import annotations

import math
from itertools import combinations
from typing import Any

from ..repositories.rubyisms import natural_sort_key, present, presence, to_f, to_i
from .models import Copy, Edge, Graph, LevelInfo, LogicalEdge, Node, Point
from .rows import WayfindingRows

ICON_OFFSET = 8.0
DESIGN_DIAGONAL = math.hypot(760, 470)
LEGACY_ICON_KINDS = ("hallway", "door", "elevator", "entry", "tour_start")
LEGACY_STOP_TYPES = ("unit", "amenity", "elevator", "building_starting_point")
GATE_KINDS = ("entry", "exit")


def parse_range(value: Any) -> list[int]:
    """`Floorplate#floors` / `Elevator#floors`: "1-5", "3", "13,14", "-1" (and the elevator's "-1-5")."""
    if value is None:
        return []
    s = str(value)
    if s == "":
        return []
    if s.count("-") == 2:  # Elevator: "-1-5"
        head, rest = s[0], s[1:].replace("-", ".", 1)
        a, b = (head + rest).split(".")
        return list(range(to_i(a), to_i(b) + 1))
    if s[0] == "-":
        return [to_i(s)]
    if "-" in s:
        a, b = s.split("-", 1)
        return list(range(to_i(a), to_i(b) + 1))
    if "," in s:
        return [to_i(f) for f in s.split(",")]
    return [to_i(s)]


def fetch_building_list(unit_buildings: list[str | None], amenity_buildings: list[str | None], sorted_building: list[str] | None) -> list[str]:
    """`Community#fetch_building_list`."""
    seen: list[str] = []
    for name in list(dict.fromkeys(b for b in unit_buildings if b is not None)) + list(dict.fromkeys(b for b in amenity_buildings if b is not None)):
        if name == "" or name in seen:
            continue
        seen.append(name)
    building_list = [b for _, b in sorted(((natural_sort_key(b), b) for b in seen), key=lambda p: p)]
    if present(sorted_building):
        sorted_building = list(sorted_building or [])
        missing = [b for b in building_list if b not in sorted_building]
        extra = [b for b in sorted_building if b not in building_list]
        if missing:
            building_list = sorted_building + missing
        elif extra:
            building_list = [b for b in building_list if b in sorted_building]
        else:
            building_list = sorted_building
    return [b for b in building_list if b is not None]


def polyline_length(line: list[Point]) -> float:
    return sum(math.hypot(ax - bx, ay - by) for (ax, ay), (bx, by) in zip(line, line[1:]))


def segment_distance(p: Point, a: Point, b: Point) -> float:
    dx = b[0] - a[0]
    dy = b[1] - a[1]
    length = dx * dx + dy * dy
    t = 0.0 if length == 0 else min(max(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length, 0.0), 1.0)
    return math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))


def polyline_distance(point: Point, line: list[Point]) -> float:
    if len(line) == 1:
        return math.hypot(point[0] - line[0][0], point[1] - line[0][1])
    return min(segment_distance(point, a, b) for a, b in zip(line, line[1:]))


class GraphBuilder:
    def __init__(self, rows: WayfindingRows, step_free: bool = False, avoid_blockers: bool = True):
        self.rows = rows
        self.step_free = step_free
        self.avoid_blockers = avoid_blockers
        self.warnings: list[str] = []
        self.graph = Graph(community=rows.community, step_free=step_free, avoid_blockers=avoid_blockers)
        self._elevator_floors_here: dict[tuple[str, str], list[int] | None] = {}
        self._level_buildings: list[str] | None = None

    # ----------------------------------------------------------------- build
    def build(self) -> Graph:
        g = self.graph
        g.tour = self.rows.main_tour
        g.warnings = self.warnings
        self._group_rows()
        self._build_levels()
        for level in g.levels:
            self._build_level(level)
        self._link_vertical()
        self._link_gates()
        g.tour_stops = list(self.rows.tour_stops) if self.rows.main_tour else []
        g.buildings = self._buildings()
        return g

    @property
    def main_tour(self) -> dict[str, Any] | None:
        return self.rows.main_tour

    def _buildings(self) -> list[str]:
        try:
            order = self.main_tour.get("building_order") if self.main_tour else None
            return fetch_building_list(self.rows.unit_buildings, self.rows.amenity_buildings, order)
        except Exception:  # the Ruby rescues anything here too
            return []

    def _group_rows(self) -> None:
        r = self.rows
        self._hallways: dict[tuple[str, int], list[dict[str, Any]]] = {}
        for h in r.hallways:
            self._hallways.setdefault((h["parent_type"], h["parent_id"]), []).append(h)
        self._edge_rows: dict[tuple[str, int], list[dict[str, Any]]] = {}
        for e in r.hallway_edges:
            self._edge_rows.setdefault((e["parent_type"], e["parent_id"]), []).append(e)
        self._attachments: dict[tuple[str, int], list[dict[str, Any]]] = {}
        for a in r.attachments:
            self._attachments.setdefault((a["parent_type"], a["parent_id"]), []).append(a)
        self._stops: dict[tuple[str, int], list[dict[str, Any]]] = {}
        for s in r.stops:
            self._stops.setdefault((s["map_type"], s["map_id"]), []).append(s)
        self._unit_doors: dict[int, list[dict[str, Any]]] = {}
        self._amenity_doors: dict[int, list[dict[str, Any]]] = {}
        self._plate_doors: dict[tuple[str, int], list[dict[str, Any]]] = {}
        for d in r.doors:
            t = d["attached_with_type"]
            if t == "Unit":
                self._unit_doors.setdefault(d["attached_with_id"], []).append(d)
            elif t == "Amenity":
                self._amenity_doors.setdefault(d["attached_with_id"], []).append(d)
            elif t in ("Floorplate", "Sitemap"):
                self._plate_doors.setdefault((t, d["attached_with_id"]), []).append(d)

    # ---------------------------------------------------------------- levels
    @staticmethod
    def floors_of(record: dict[str, Any], kind: str) -> list[int]:
        if kind != "floorplate" or not present(record.get("range")):
            return []
        try:
            return parse_range(record["range"])
        except Exception:
            return []

    def _build_levels(self) -> None:
        community = self.rows.community
        if present(community.get("is_sitemap")):
            records = [("sitemap", self.rows.sitemap)] if self.rows.sitemap else []
        else:
            records = [("floorplate", fp) for fp in self.rows.floorplates]
            records.sort(key=lambda kr: ((min(self.floors_of(kr[1], "floorplate")) if self.floors_of(kr[1], "floorplate") else 0), kr[1]["id"]))
        levels: list[LevelInfo] = []
        for kind, record in records:
            floors = self.floors_of(record, kind)
            width = to_f(record.get("width"))
            height = to_f(record.get("height"))
            levels.append(
                LevelInfo(
                    key=f"{kind}:{record['id']}",
                    kind=kind,
                    record=record,
                    floors=floors,
                    building=presence(record.get("building")) if kind == "floorplate" else None,
                    width=width,
                    height=height,
                    space="raster",
                    copies=list(floors) if len(floors) > 1 else [None],
                    unit=math.hypot(width, height) / DESIGN_DIAGONAL if width > 0 and height > 0 else 1.0,
                )
            )
        self.graph.levels = levels

    def _level_buildings_list(self) -> list[str]:
        if self._level_buildings is None:
            self._level_buildings = list(dict.fromkeys(l.building for l in self.graph.levels if l.building is not None))
        return self._level_buildings

    def _belongs_elsewhere(self, building: str | None, level: LevelInfo) -> bool:
        return present(building) and present(level.building) and building != level.building and building in self._level_buildings_list()

    @staticmethod
    def centre(x: Any, y: Any) -> Point:
        return (to_f(x) + ICON_OFFSET, to_f(y) + ICON_OFFSET)

    def _add_node(self, node: Node) -> Node:
        self.graph.nodes.setdefault(node.key, node)
        self.graph.node_levels.setdefault(node.key, []).append(node)
        return node

    @staticmethod
    def _record_class(level: LevelInfo) -> str:
        return "Floorplate" if level.kind == "floorplate" else "Sitemap"

    @staticmethod
    def _plotted_int(record: dict[str, Any]) -> bool:
        return to_i(record.get("x_plot")) > 0 or to_i(record.get("y_plot")) > 0

    @staticmethod
    def _lock_provider_of(record: dict[str, Any], door: dict[str, Any] | None) -> str | None:
        return presence(door.get("lock_provider")) if door and presence(door.get("lock_provider")) else presence(record.get("lock_provider"))

    def _blocker_radius(self, level: LevelInfo) -> float:
        return max(level.width, level.height) * 30.0 / 760 if level.width > 0 else 30.0

    # ----------------------------------------------------------------- level
    def _build_level(self, level: LevelInfo) -> None:  # noqa: C901 - mirrors the Ruby method
        g = self.graph
        key = (self._record_class(level), level.record["id"])
        hallways = self._hallways.get(key, [])
        edge_rows = self._edge_rows.get(key, [])
        attachments = self._attachments.get(key, [])
        stops = self._stops.get(key, [])
        plate_doors = self._plate_doors.get(key, [])
        attachment_of: dict[tuple[str, int], dict[str, Any]] = {}
        for a in attachments:
            attachment_of[(a["attachable_type"], a["attachable_id"])] = a  # index_by: the last row wins
        by_id = {h["id"]: h for h in hallways}

        hallway_nodes: list[Node] = []
        for h in hallways:
            cx, cy = self.centre(h["x_plot"], h["y_plot"])
            hallway_nodes.append(
                self._add_node(Node(key=f"hallway:{h['id']}", kind="hallway", record=h, record_type="Hallway", level_key=level.key, floor=None, building=level.building, x=cx, y=cy, name=None, anchor="point", review=h.get("review_status")))
            )

        # Logical hallway edges once: adjacency from next_points, decorated by the rows.
        rows_by_pair: dict[tuple[int, int], dict[str, Any]] = {}
        for row in edge_rows:
            rows_by_pair[(row["from_hallway_id"], row["to_hallway_id"])] = row
        pairs: dict[tuple[int, int], bool] = {}
        for h in hallways:
            for other_id in h.get("next_points") or []:
                if other_id not in by_id:
                    continue
                pairs.setdefault((min(h["id"], other_id), max(h["id"], other_id)), True)
        for pair in rows_by_pair:
            if pair[0] in by_id and pair[1] in by_id:
                pairs.setdefault(pair, True)
        logical: list[LogicalEdge] = []
        for a_id, b_id in pairs:
            a = g.nodes[f"hallway:{a_id}"]
            b = g.nodes[f"hallway:{b_id}"]
            row = rows_by_pair.get((a_id, b_id))
            interior: list[Point] = []
            if row:
                points = [(to_f(p[0]), to_f(p[1])) for p in (row.get("path_points") or [])]
                if a_id != row["from_hallway_id"]:
                    points.reverse()
                interior = [self.centre(px, py) for px, py in points]
            line = [(a.x, a.y)] + interior + [(b.x, b.y)]
            logical.append(LogicalEdge(a=a.key, b=b.key, kind=(row or {}).get("kind") or "manual", polyline=line, length=polyline_length(line), review=(row or {}).get("review_status") or "confirmed", level_key=level.key))
        g.logical_edges.extend(logical)

        degree: dict[str, int] = {}
        for e in logical:
            degree[e.a] = degree.get(e.a, 0) + 1
            degree[e.b] = degree.get(e.b, 0) + 1

        anchors: list[Node] = []
        stacked = len(level.copies) > 1
        # units
        for unit in self.rows.units:
            on_level = unit.get("floorplate_id") is None if level.kind == "sitemap" else unit.get("floorplate_id") == level.record["id"]
            if not on_level:
                continue
            doors = self._unit_doors.get(unit["id"], [])
            door = min(doors, key=lambda d: (to_i(d.get("sort")), d["id"])) if doors else None
            pos = self.centre(door["x_plot"], door["y_plot"]) if door and self._plotted_int(door) else (to_f(unit.get("x_plot")), to_f(unit.get("y_plot")))
            anchors.append(
                self._add_node(
                    Node(key=f"unit:{unit['id']}", kind="unit", record=unit, record_type="Unit", level_key=level.key, floor=unit.get("floor") if stacked else None, building=presence(unit.get("building")) or level.building, x=pos[0], y=pos[1], name=unit.get("marketing_name"), anchor="door" if door else "pin", lock_provider=self._lock_provider_of(unit, door), note=presence(unit.get("stop_description")))
                )
            )
        # amenities
        auto_wayfinding = present(self.rows.community.get("auto_wayfinding"))
        for amenity in self.rows.amenities:
            if not (amenity.get("amenityable_type") == self._record_class(level) and amenity.get("amenityable_id") == level.record["id"]):
                continue
            doors = self._amenity_doors.get(amenity["id"], [])
            if doors:
                door = min(doors, key=(lambda d: (to_i(d.get("sort")), d["id"])) if auto_wayfinding else (lambda d: (d.get("created_at"), d["id"])))
            else:
                door = None
            pos = self.centre(door["x_plot"], door["y_plot"]) if door and self._plotted_int(door) else (to_f(amenity.get("x_plot")), to_f(amenity.get("y_plot")))
            anchors.append(
                self._add_node(
                    Node(key=f"amenity:{amenity['id']}", kind="amenity", record=amenity, record_type="Amenity", level_key=level.key, floor=amenity.get("floor") if stacked and present(amenity.get("floor")) else None, building=presence(amenity.get("building")) or level.building, x=pos[0], y=pos[1], name=amenity.get("name"), anchor="door" if door else "pin", lock_provider=self._lock_provider_of(amenity, door), note=presence(amenity.get("directional_text")))
                )
            )
        # plate doors (access points): pass-through stops
        for door in plate_doors:
            if not self._plotted_int(door):
                continue
            cx, cy = self.centre(door["x_plot"], door["y_plot"])
            anchors.append(
                self._add_node(Node(key=f"door:{door['id']}", kind="door", record=door, record_type="Door", level_key=level.key, floor=door.get("floor"), building=level.building, x=cx, y=cy, name=door.get("name"), anchor="icon_top_left", note=presence(door.get("note")), lock_provider=presence(door.get("lock_provider"))))
            )
        # elevators (every kind)
        for elevator in self.rows.elevators:
            if not self._elevator_on_level(elevator, level):
                continue
            served = self._elevator_floors(elevator)
            floors_here: list[int] | None = [f for f in served if f in level.floors] if stacked else None
            if floors_here is not None and len(floors_here) == len(level.floors):
                floors_here = None
            cx, cy = self.centre(elevator["x_plot"], elevator["y_plot"])
            node = self._add_node(
                Node(key=f"elevator:{elevator['id']}", kind="elevator", record=elevator, record_type="Elevator", level_key=level.key, floor=None, building=presence(elevator.get("building")) or level.building, x=cx, y=cy, name=elevator.get("name"), anchor="icon_top_left", vertical=elevator.get("kind") or "elevator", accessible=elevator.get("accessible") is not False, served=served, lock_provider=presence(elevator.get("lock_provider")), note=presence(elevator.get("directional_text")))
            )
            self._elevator_floors_here[(level.key, node.key)] = floors_here
            anchors.append(node)
        # building entry/exit points
        for bsp in self.rows.bsps:
            if level.kind == "floorplate" and to_i(bsp.get("floor")) not in level.floors:
                continue
            if self._belongs_elsewhere(bsp.get("building"), level):
                continue
            if not self._plotted_int(bsp):
                continue
            cx, cy = self.centre(bsp["x_plot"], bsp["y_plot"])
            node = self._add_node(
                Node(key=f"bsp:{bsp['id']}", kind="entry", record=bsp, record_type="BuildingStartingPoint", level_key=level.key, floor=bsp.get("floor") if stacked else None, building=presence(bsp.get("building")) or level.building, x=cx, y=cy, name=bsp.get("name"), anchor="icon_top_left", lock_provider=presence(bsp.get("lock_provider")), note=presence(bsp.get("directional_text")))
            )
            anchors.append(node)
            g.gates.append(node)
        # tour start
        tour = self.main_tour
        if tour and self._plotted_int(tour) and self._tour_start_on(level):
            cx, cy = self.centre(tour["x_plot"], tour["y_plot"])
            start_floor = tour.get("starting_floor") if tour.get("starting_floor") is not None else (min(level.floors) if level.floors else None)
            node = self._add_node(
                Node(key=f"tour_start:{tour['id']}", kind="tour_start", record=tour, record_type="Tour", level_key=level.key, floor=start_floor if stacked else None, building=presence(tour.get("building")) or level.building, x=cx, y=cy, name=presence(tour.get("name")) or "Tour start", anchor="icon_top_left")
            )
            anchors.append(node)
            g.gates.append(node)
        # wayfinding stops
        for stop in stops:
            if stop.get("x_plot") is None or stop.get("y_plot") is None:
                continue
            is_blocker = stop["kind"] == "blocker"
            node = self._add_node(
                Node(key=f"stop:{stop['id']}", kind=stop["kind"], record=stop, record_type="WayfindingStop", level_key=level.key, floor=stop.get("floor"), building=presence(stop.get("building")) or level.building, x=to_f(stop["x_plot"]), y=to_f(stop["y_plot"]), name=stop.get("name"), anchor="point", accessible=stop.get("accessible"), note=presence(stop.get("note")), lock_provider=presence(stop.get("lock_provider")), radius=(to_f(stop["radius_px"]) if stop.get("radius_px") is not None else self._blocker_radius(level)) if is_blocker else None)
            )
            if not is_blocker:
                anchors.append(node)
            if stop["kind"] in GATE_KINDS:
                g.gates.append(node)

        # attachments: explicit / detached / nearest
        for node in anchors:
            att = attachment_of.get((self._attachable_type_of(node), node.record["id"]))
            if att and att.get("mode") == "detached":
                node.attach = None
                node.link = "detached"
                continue
            if att and att.get("mode") == "explicit" and att.get("hallway_id") in by_id:
                node.attach = f"hallway:{att['hallway_id']}"
                node.link = "explicit"
                anchor = (to_f(att["anchor_x"]), to_f(att["anchor_y"])) if att.get("anchor_x") is not None and att.get("anchor_y") is not None else None
                if anchor and node.kind in ("unit", "amenity"):
                    node.x, node.y = anchor
                continue
            nearest = min(hallway_nodes, key=lambda h: math.hypot(h.x - node.x, h.y - node.y)) if hallway_nodes else None
            node.attach = nearest.key if nearest else None
            node.link = "nearest" if nearest else "none"

        # per-floor copies
        blockers = [s for s in stops if s["kind"] == "blocker" and s.get("x_plot") is not None and s.get("y_plot") is not None]
        for floor in level.copies:
            cuts = [b for b in blockers if floor is None or b.get("floor") is None or b.get("floor") == floor] if self.avoid_blockers else []
            for h in hallway_nodes:
                self._register_copy(h, floor)
            for e in logical:
                if any(polyline_distance((to_f(b["x_plot"]), to_f(b["y_plot"])), e.polyline) < (to_f(b["radius_px"]) if b.get("radius_px") is not None else self._blocker_radius(level)) for b in cuts):
                    continue
                self._connect(g.copy_key(e.a, level.key, floor), g.copy_key(e.b, level.key, floor), "walk", e.length, e.polyline, None)
            for node in anchors:
                floors_here = self._elevator_floors_here.get((level.key, node.key)) if node.kind == "elevator" else (None if node.floor is None else [node.floor])
                if floor is not None and floors_here is not None and floor not in floors_here:
                    continue
                copy = self._register_copy(node, floor)
                point_key = g.copy_key(node.attach, level.key, floor) if node.attach else None
                point = g.copy_nodes.get(point_key) if point_key else None
                if not point_key or point is None:
                    continue
                linked = degree.get(node.attach or "", 0) > 0
                if linked:
                    self._connect(copy, point_key, "link", math.hypot(node.x - point.x, node.y - point.y), [(node.x, node.y), (point.x, point.y)], None)
                g.copy_nodes[copy].linked = linked
                if node.kind == "elevator":
                    g.vertical.setdefault(node.key, []).append(copy)

    @staticmethod
    def _attachable_type_of(node: Node) -> str:
        if node.kind == "unit":
            return "Unit"
        if node.kind == "amenity":
            return "Amenity"
        if node.kind == "door":
            return "Door"
        if node.kind == "elevator":
            return "Elevator"
        if node.kind == "entry":
            return "BuildingStartingPoint" if node.record_type == "BuildingStartingPoint" else "WayfindingStop"
        if node.kind == "tour_start":
            return "Tour"
        return "WayfindingStop"

    def _register_copy(self, node: Node, floor: int | None) -> str:
        g = self.graph
        key = g.copy_key(node.key, node.level_key, floor)
        if key not in g.copy_nodes:
            g.copy_nodes[key] = Copy(key=key, node=node, floor=floor, level_key=node.level_key, x=node.x, y=node.y, linked=node.kind == "hallway")
        g.adjacency.setdefault(key, [])
        return key

    def _connect(self, a: str, b: str, kind: str, weight: float, polyline: list[Point] | None, name: str | None) -> None:
        g = self.graph
        g.adjacency.setdefault(a, []).append(Edge(frm=a, to=b, kind=kind, weight=weight, polyline=polyline, name=name))
        g.adjacency.setdefault(b, []).append(Edge(frm=b, to=a, kind=kind, weight=weight, polyline=list(reversed(polyline)) if polyline is not None else None, name=name))

    @staticmethod
    def _elevator_floors(elevator: dict[str, Any]) -> list[int]:
        if not present(elevator.get("floorplate_covering_range")):
            return []
        try:
            return parse_range(elevator["floorplate_covering_range"])
        except Exception:
            return []

    def _elevator_on_level(self, elevator: dict[str, Any], level: LevelInfo) -> bool:
        if not self._plotted_int(elevator):
            return False
        if level.kind == "sitemap":
            return elevator.get("sitemap_id") == level.record["id"] or (elevator.get("sitemap_id") is None and elevator.get("floorplate_id") is None)
        overlap = any(f in level.floors for f in self._elevator_floors(elevator)) or elevator.get("floorplate_id") == level.record["id"]
        return overlap and not self._belongs_elsewhere(elevator.get("building"), level)

    def _tour_start_on(self, level: LevelInfo) -> bool:
        tour = self.main_tour or {}
        if self._belongs_elsewhere(tour.get("building"), level):
            return False
        if level.kind == "sitemap":
            return True
        all_floors = [f for l in self.graph.levels for f in l.floors]
        start_floor = tour.get("starting_floor") if tour.get("starting_floor") is not None else (min(all_floors) if all_floors else None)
        if start_floor is None:
            return bool(self.graph.levels) and self.graph.levels[0].key == level.key
        return start_floor in level.floors

    def _floor_number(self, copy: Copy) -> int | None:
        if copy.floor is not None:
            return copy.floor
        level = self.graph.level(copy.level_key)
        return level.floors[0] if level and level.floors else None

    def _link_vertical(self) -> None:
        g = self.graph
        for copies in g.vertical.values():
            for a_key, b_key in combinations(copies, 2):
                a = g.copy_nodes[a_key]
                b = g.copy_nodes[b_key]
                if a_key == b_key or not (a.linked and b.linked):
                    continue
                node = a.node
                if self.step_free and (node.vertical == "stairs" or node.accessible is False):
                    continue
                fa = self._floor_number(a)
                fb = self._floor_number(b)
                floors = max(1, abs(fa - fb)) if fa is not None and fb is not None else 1
                la = g.level(a.level_key)
                lb = g.level(b.level_key)
                unit = ((la.unit if la else 1.0) + (lb.unit if lb else 1.0)) / 2.0
                weight = (90.0 * floors if node.vertical == "stairs" else 50.0 + 10.0 * floors) * unit
                kind = "stairs" if node.vertical == "stairs" else "ramp" if node.vertical == "ramp" else "elevator"
                self._connect(a_key, b_key, kind, weight, None, node.name)

    def _link_gates(self) -> None:
        g = self.graph
        gate_copies: list[Copy] = []
        for node in g.gates:
            gate_copies.extend(c for c in g.copy_nodes.values() if c.node is node and c.linked)
        for a, b in combinations(gate_copies, 2):
            ba = a.node.building
            bb = b.node.building
            if not present(ba) or not present(bb) or ba == bb:
                continue
            la = g.level(a.level_key)
            lb = g.level(b.level_key)
            unit = ((la.unit if la else 1.0) + (lb.unit if lb else 1.0)) / 2.0
            self._connect(a.key, b.key, "outdoor", 500.0 * unit, None, f"{a.node.name}|{b.node.name}")
