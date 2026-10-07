"""Builds and caches a property's graph.

A graph is keyed by (property, graph version, step_free, avoid_blockers).
The version (`graph_version`) is computed on every request from the
database (one aggregate query), so a changed stop, path, elevator or tour
setup produces a new key and the old graph is simply never used again;
entries also expire after a TTL. Nothing here writes.
"""
from __future__ import annotations

import threading
import time
from dataclasses import dataclass
from typing import Any

from ..config import Settings
from ..repositories.db import Database
from .graph_builder import GraphBuilder
from .graph_serializer import GraphSerializer
from .graph_version import graph_version
from .models import Graph
from .rows import WayfindingRows, load_rows


@dataclass
class BuiltGraph:
    version: str
    rows: WayfindingRows
    graph: Graph
    built_at: float
    payload: dict[str, Any] | None = None


class WayfindingEngine:
    def __init__(self, db: Database, settings: Settings):
        self.db = db
        self.settings = settings
        self._cache: dict[tuple[int, str, bool, bool], BuiltGraph] = {}
        self._lock = threading.Lock()

    def version(self, community_id: int) -> str:
        return graph_version(self.db, community_id)

    def graph(self, community_id: int, *, step_free: bool = False, avoid_blockers: bool = True, version: str | None = None) -> BuiltGraph | None:
        version = version or self.version(community_id)
        key = (community_id, version, step_free, avoid_blockers)
        now = time.monotonic()
        with self._lock:
            hit = self._cache.get(key)
            if hit and now - hit.built_at < self.settings.graph_cache_ttl:
                return hit
        rows = load_rows(self.db, community_id)
        if rows is None:
            return None
        graph = GraphBuilder(rows, step_free=step_free, avoid_blockers=avoid_blockers).build()
        built = BuiltGraph(version=version, rows=rows, graph=graph, built_at=now)
        with self._lock:
            # Drop older versions of the same property so memory follows the data.
            for old in [k for k in self._cache if k[0] == community_id and k[1] != version]:
                self._cache.pop(old, None)
            self._cache[key] = built
        return built

    def payload(self, community_id: int, version: str | None = None) -> dict[str, Any] | None:
        built = self.graph(community_id, version=version)
        if built is None:
            return None
        if built.payload is None:
            built.payload = GraphSerializer(built.graph, version=built.version, public_base=self.settings.public_uploads_url, bucket_hint=built.rows.bucket_hint).as_json()
        return built.payload

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()
