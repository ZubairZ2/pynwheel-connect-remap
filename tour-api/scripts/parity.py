"""Parity harness: the FastAPI port vs the Rails Tour App API on real data.

Usage (with the Rails verify server on :3100, API_ACCESS=true, dev database):

    .venv/bin/python scripts/parity.py 1411 1618 2934 1468 1234 --rails http://127.0.0.1:3100

For each property it compares the graph payloads (levels without the URL
fields, buildings, nodes, edges, vertical connections, gates, tour) and a
set of routes (every tour stop from the tour start, the whole tour route,
and a few stop-to-stop pairs) leg by leg and step by step. Exit code 1 on
any difference.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Any

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import get_settings  # noqa: E402
from app.repositories.db import Database  # noqa: E402
from app.wayfinding.engine import WayfindingEngine  # noqa: E402
from app.wayfinding.graph_serializer import route_json  # noqa: E402
from app.wayfinding.route_service import RouteService  # noqa: E402

URL_FIELDS = {"image", "svg"}


def strip(payload: dict[str, Any]) -> dict[str, Any]:
    out = {k: v for k, v in payload.items() if k not in ("version",)}
    out["levels"] = [{k: v for k, v in level.items() if k not in URL_FIELDS} for level in payload["levels"]]
    return out


def sort_nodes(nodes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(nodes, key=lambda n: (n["id"], n["level"]))


def sort_edges(edges: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(edges, key=lambda e: (e["level"], e["from"], e["to"]))


def diff(a: Any, b: Any, path: str, out: list[str], limit: int = 40) -> None:
    if len(out) >= limit:
        return
    if isinstance(a, dict) and isinstance(b, dict):
        for k in sorted(set(a) | set(b)):
            if k not in a:
                out.append(f"{path}.{k}: missing in FastAPI")
            elif k not in b:
                out.append(f"{path}.{k}: missing in Rails")
            else:
                diff(a[k], b[k], f"{path}.{k}", out, limit)
    elif isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            out.append(f"{path}: length {len(a)} (Rails) vs {len(b)} (FastAPI)")
        for i, (x, y) in enumerate(zip(a, b)):
            diff(x, y, f"{path}[{i}]", out, limit)
    else:
        if isinstance(a, (int, float)) and isinstance(b, (int, float)) and not isinstance(a, bool) and not isinstance(b, bool):
            if abs(float(a) - float(b)) > 0.011:
                out.append(f"{path}: {a!r} (Rails) vs {b!r} (FastAPI)")
        elif a != b:
            out.append(f"{path}: {a!r} (Rails) vs {b!r} (FastAPI)")


def normalize_route(payload: dict[str, Any]) -> dict[str, Any]:
    out = {k: v for k, v in payload.items() if k != "version"}
    return out


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("ids", nargs="+", type=int)
    parser.add_argument("--rails", default="http://127.0.0.1:3100")
    parser.add_argument("--pairs", type=int, default=6, help="stop-to-stop pairs to compare per property")
    args = parser.parse_args()

    settings = get_settings()
    db = Database(settings.database_url)
    db.open()
    engine = WayfindingEngine(db, settings)
    client = httpx.Client(base_url=args.rails, timeout=120)
    failures = 0
    for cid in args.ids:
        print(f"\n== property {cid} ==")
        t0 = time.perf_counter()
        rails = client.get(f"/api/self_tour/v1/communities/{cid}/wayfinding.json")
        t1 = time.perf_counter()
        if rails.status_code != 200:
            print(f"  Rails answered {rails.status_code}: {rails.text[:200]}")
            failures += 1
            continue
        rails_graph = rails.json()
        t2 = time.perf_counter()
        built = engine.graph(cid)
        mine = engine.payload(cid)
        t3 = time.perf_counter()
        assert built and mine
        a = strip(rails_graph)
        b = strip(mine)
        a["nodes"], b["nodes"] = sort_nodes(a["nodes"]), sort_nodes(b["nodes"])
        a["edges"], b["edges"] = sort_edges(a["edges"]), sort_edges(b["edges"])
        # Rails loads elevators and entry points without an ORDER BY (heap order); the port orders by id.
        for key in ("vertical_connections", "gates"):
            a[key], b[key] = sorted(a[key], key=lambda x: x["id"]), sorted(b[key], key=lambda x: x["id"])
        problems: list[str] = []
        diff(a, b, "graph", problems)
        print(f"  graph: Rails {t1 - t0:.2f}s, FastAPI {t3 - t2:.2f}s; nodes {len(a['nodes'])}/{len(b['nodes'])}, edges {len(a['edges'])}/{len(b['edges'])}, levels {len(a['levels'])}/{len(b['levels'])}")
        for level_a, level_b in zip(rails_graph["levels"], mine["levels"]):
            for f in URL_FIELDS:
                if level_a.get(f) != level_b.get(f):
                    print(f"  url {level_a['id']}.{f}: Rails {level_a.get(f)!r} / FastAPI {level_b.get(f)!r}")
        if problems:
            failures += 1
            print("  GRAPH DIFFERENCES:")
            for p in problems:
                print("   ", p)
        else:
            print("  graph: identical")

        # Routes: start -> each tour stop, a few stop pairs, the whole tour.
        tour = rails_graph.get("tour") or {}
        start = tour.get("start")
        stops = [s["node"] for s in tour.get("stops", []) if s.get("node") and s.get("on_map") and s.get("visible")]
        pairs: list[tuple[str, str]] = []
        if start:
            pairs += [(start, s) for s in stops]
        pairs += [(stops[i], stops[j]) for i in range(len(stops)) for j in range(len(stops)) if i < j][: args.pairs]
        route_problems = 0
        for frm, to in pairs:
            r = client.get(f"/api/self_tour/v1/communities/{cid}/wayfinding/route.json", params={"from": frm, "to": to})
            rails_route = r.json()
            service = RouteService(built.graph, from_key=frm, to_key=to, open_graph=engine.graph(cid, avoid_blockers=False).graph)
            mine_route = route_json(service.call(), version=built.version, step_free=False, avoid_blockers=True)
            problems = []
            diff(normalize_route(rails_route), normalize_route(mine_route), f"route {frm}->{to}", problems)
            if problems:
                route_problems += 1
                for p in problems[:12]:
                    print("   ", p)
        if start:
            r = client.get(f"/api/self_tour/v1/communities/{cid}/wayfinding/tour_route.json")
            rails_tour = r.json()
            mine_tour = route_json(RouteService(built.graph, open_graph=engine.graph(cid, avoid_blockers=False).graph).tour(), version=built.version, step_free=False, avoid_blockers=True)
            problems = []
            a_t, b_t = normalize_route(rails_tour), normalize_route(mine_tour)
            # The Ruby sums unknown durations as 0; the port reports None when unknown. Compare the rest.
            if a_t.get("duration_s") in (0, None) and b_t.get("duration_s") is None:
                a_t.pop("duration_s", None)
                b_t.pop("duration_s", None)
            diff(a_t, b_t, "tour_route", problems)
            if problems:
                route_problems += 1
                for p in problems[:12]:
                    print("   ", p)
        print(f"  routes: {len(pairs)} pairs + tour compared, {route_problems} with differences")
        failures += route_problems
    print(f"\n{'OK' if failures == 0 else 'DIFFERENCES'}: {failures} failing comparison(s)")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
