"""The in-memory graph, a port of the structs in `Wayfinding::GraphBuilder`."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

Point = tuple[float, float]


@dataclass
class Node:
    key: str
    kind: str
    record: dict[str, Any]
    record_type: str  # Hallway | Unit | Amenity | Door | Elevator | BuildingStartingPoint | Tour | WayfindingStop
    level_key: str
    floor: int | None
    building: str | None
    x: float
    y: float
    name: str | None
    anchor: str
    review: str | None = None
    vertical: str | None = None
    accessible: bool | None = None
    served: list[int] | None = None
    attach: str | None = None
    link: str | None = None
    note: str | None = None
    lock_provider: str | None = None
    radius: float | None = None


@dataclass
class Edge:
    frm: str
    to: str
    kind: str  # walk | link | elevator | stairs | ramp | outdoor
    weight: float
    polyline: list[Point] | None
    name: str | None


@dataclass
class LevelInfo:
    key: str
    kind: str  # floorplate | sitemap
    record: dict[str, Any]
    floors: list[int]
    building: str | None
    width: float
    height: float
    space: str
    copies: list[int | None]
    unit: float


@dataclass
class Copy:
    key: str
    node: Node
    floor: int | None
    level_key: str
    x: float
    y: float
    linked: bool


@dataclass
class LogicalEdge:
    a: str
    b: str
    kind: str
    polyline: list[Point]
    length: float
    review: str
    level_key: str


@dataclass
class Graph:
    community: dict[str, Any]
    levels: list[LevelInfo] = field(default_factory=list)
    nodes: dict[str, Node] = field(default_factory=dict)
    node_levels: dict[str, list[Node]] = field(default_factory=dict)
    copy_nodes: dict[str, Copy] = field(default_factory=dict)
    adjacency: dict[str, list[Edge]] = field(default_factory=dict)
    logical_edges: list[LogicalEdge] = field(default_factory=list)
    vertical: dict[str, list[str]] = field(default_factory=dict)
    gates: list[Node] = field(default_factory=list)
    tour: dict[str, Any] | None = None
    tour_stops: list[dict[str, Any]] = field(default_factory=list)
    buildings: list[str] = field(default_factory=list)
    step_free: bool = False
    avoid_blockers: bool = True
    warnings: list[str] = field(default_factory=list)

    def level(self, key: str | None) -> LevelInfo | None:
        for level in self.levels:
            if level.key == key:
                return level
        return None

    @staticmethod
    def copy_key(node_key: str, level_key: str, floor: int | None) -> str:
        return f"{node_key}@{level_key}@{'' if floor is None else floor}"

    def node(self, copy_key: str) -> Copy | None:
        return self.copy_nodes.get(copy_key)

    def instances(self, key: str) -> list[Node]:
        return self.node_levels.get(key, [])

    def edges_of(self, copy_key: str) -> list[Edge]:
        return self.adjacency.get(copy_key, [])

    def all_edges(self) -> list[Edge]:
        return [e for edges in self.adjacency.values() for e in edges]
