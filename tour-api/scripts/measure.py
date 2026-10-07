"""Measure the live API with real data: response time and payload size per
endpoint, for one or more properties.

    TOUR_API_URL=http://127.0.0.1:8000 EMAIL=... PASSWORD=... .venv/bin/python scripts/measure.py 1411 1618 2934
"""
from __future__ import annotations

import json
import os
import sys
import time

import httpx


def main() -> int:
    base = os.environ.get("TOUR_API_URL", "http://127.0.0.1:8000")
    email = os.environ["EMAIL"]
    password = os.environ["PASSWORD"]
    ids = [int(a) for a in sys.argv[1:]] or [1411]
    client = httpx.Client(base_url=base, timeout=60)

    def timed(method: str, path: str, **kw):
        t = time.perf_counter()
        r = client.request(method, path, **kw)
        ms = (time.perf_counter() - t) * 1000
        print(f"  {method:4} {path:60} {r.status_code} {ms:7.1f} ms {len(r.content):8,d} B")
        return r

    r = timed("POST", "/api/v1/auth/login", json={"email": email, "password": password})
    r.raise_for_status()
    token = r.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    timed("GET", "/api/v1/auth/me")
    timed("GET", "/api/v1/properties")
    timed("GET", "/api/v1/properties?tour_enabled=true")
    for cid in ids:
        print(f"\n== property {cid} ==")
        timed("GET", f"/api/v1/properties/{cid}")
        stops = timed("GET", f"/api/v1/properties/{cid}/stops")
        timed("GET", f"/api/v1/properties/{cid}/map")
        graph = timed("GET", f"/api/v1/properties/{cid}/graph")
        if graph.status_code == 200:
            etag = graph.headers.get("ETag")
            timed("GET", f"/api/v1/properties/{cid}/graph", headers={"If-None-Match": etag})
            level = graph.json()["levels"][0]["id"]
            timed("GET", f"/api/v1/properties/{cid}/map/levels/{level}")
        if stops.status_code != 200:
            continue
        ids_list = [s["id"] for g in stops.json()["groups"] for s in g["stops"]]
        routable = [s["id"] for g in stops.json()["groups"] for s in g["stops"] if s["routable"]]
        start = stops.json()["start_node"]
        if ids_list:
            timed("POST", f"/api/v1/properties/{cid}/stops/distances", json={"stop_ids": ids_list})
        if start and routable:
            timed("POST", f"/api/v1/properties/{cid}/route", json={"from_stop_id": start, "to_stop_id": routable[0]})
        if routable:
            r = timed("POST", f"/api/v1/properties/{cid}/tour-route", json={"stop_ids": routable[:6]})
            if r.status_code == 200:
                body = r.json()
                print(f"       segments {len(body['segments'])}, skipped {body['skipped']}, steps {len(body['route']['steps'])}, floors {[f['name'] for f in body['route']['floors']]}")
                for seg in body["segments"][:3]:
                    print("       ", seg["stop_id"], "←", seg["from_stop_id"], [ (s["title"], s["description"]) for s in seg["route"]["steps"] ])
            else:
                print("      ", r.json())
    timed("POST", "/api/v1/auth/logout")
    timed("GET", "/api/v1/auth/me")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
