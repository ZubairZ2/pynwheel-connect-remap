import pytest

from tests.conftest import TOUR_PROPERTY, Env


def route(env: Env, **body) -> tuple[int, dict]:
    r = env.client.post(f"/api/v1/properties/{TOUR_PROPERTY}/route", json=body, headers=env.auth())
    return r.status_code, r.json()


def test_same_floor_route(env: Env):
    status, body = route(env, from_stop_id="tour_start:7", to_stop_id="amenity:11")
    assert status == 200, body
    r = body["route"]
    assert r["start"] == {"id": "tour_start:7", "type": "tour_start", "name": "Main Tour"}
    assert r["destination"]["name"] == "Gym"
    assert [l["kind"] for l in r["legs"]] == ["walk"]
    assert r["legs"][0]["floor"] == 1 and r["legs"][0]["level"] == "floorplate:1"
    assert r["total_distance"] > 0 and r["unit"] == "px" and r["total_distance_ft"] is None and r["duration_s"] is None
    assert r["floors"] == [{"level_id": "floorplate:1", "number": 1, "name": "Floor 1"}]
    assert r["stages"] == [{"level_id": "floorplate:1", "floor": 1, "building": "A", "leg": 0}]
    steps = r["steps"]
    assert [s["type"] for s in steps] == ["walk", "arrive"]
    walk, arrive = steps
    assert walk["title"] == "Walk on Floor 1"
    assert walk["description"] == f"From Main Tour to Gym · {round(r['total_distance']):,} px"
    assert walk["distance"] == pytest.approx(r["total_distance"]) and walk["geometry"][0] == [98, 100]
    assert walk["from"]["name"] == "Main Tour" and walk["to"]["name"] == "Gym" and walk["floor"]["name"] == "Floor 1"
    assert arrive["title"] == "Arrive at Gym" and arrive["description"] == "Floor 1"
    assert arrive["instruction"] == "Past the mailroom.", "the stop's own directional text, as plain text"


def test_cross_floor_route_uses_the_elevator(env: Env):
    status, body = route(env, from_stop_id="unit:101", to_stop_id="unit:301")
    assert status == 200, body
    r = body["route"]
    assert [l["kind"] for l in r["legs"]] == ["walk", "elevator", "walk"]
    assert r["legs"][1]["via"] == "elevator:50" and r["legs"][1]["floor_from"] == 1 and r["legs"][1]["floor_to"] == 3
    assert [s["type"] for s in r["steps"]] == ["walk", "elevator", "walk", "arrive"]
    assert r["steps"][1]["title"] == "Take Elevator 1 to Floor 3" and r["steps"][1]["description"] == "Up 2 floors"
    assert r["steps"][1]["transition"] == {"kind": "elevator", "via": "elevator:50", "name": "Elevator 1", "floor_from": 1, "floor_to": 3, "from_level_id": "floorplate:1", "to_level_id": "floorplate:1"}
    assert r["steps"][2]["title"] == "Walk on Floor 3"
    assert [f["number"] for f in r["floors"]] == [1, 3]
    assert [(s["floor"], s["leg"]) for s in r["stages"]] == [(1, 0), (3, 2)]
    assert r["steps"][-1] == {**r["steps"][-1], "title": "Arrive at 301", "description": "Floor 3"}


def test_stairs_when_asked_without_step_free(env: Env):
    # Make the lift unavailable to force the stairs: route floor 1 -> 3 from the stairs' side.
    status, body = route(env, from_stop_id="elevator:51", to_stop_id="unit:301", from_floor=1)
    assert status == 200, body
    kinds = [l["kind"] for l in body["route"]["legs"]]
    assert "stairs" in kinds
    stairs = next(s for s in body["route"]["steps"] if s["type"] == "stairs")
    assert stairs["title"] == "Take the stairs to Floor 3"


def test_step_free_refuses_inaccessible_stairs_only_path(env: Env):
    status, body = route(env, from_stop_id="elevator:51", to_stop_id="unit:301", from_floor=1, step_free=True)
    # Step-free: the stairs are skipped; the lift still links the floors, so a route exists through it.
    assert status == 200, body
    assert all(l["kind"] != "stairs" for l in body["route"]["legs"])


def test_ambiguous_floor_for_a_connector(env: Env):
    status, body = route(env, from_stop_id="elevator:50", to_stop_id="unit:301")
    assert status == 422 and body["error"]["code"] == "ambiguous_floor"


def test_disconnected_destination(env: Env):
    status, body = route(env, from_stop_id="unit:101", to_stop_id="unit:999")
    assert status == 422
    assert body["error"]["code"] == "not_linked"
    assert "Island" in body["error"]["message"]


def test_invalid_endpoints(env: Env):
    status, body = route(env, from_stop_id="unit:424242", to_stop_id="unit:101")
    assert status == 422 and body["error"]["code"] == "unknown_endpoint"
    status, body = route(env, from_stop_id="unit:101", to_stop_id="unit:101")
    assert status == 422 and body["error"]["code"] == "same_endpoint"
    r = env.client.post(f"/api/v1/properties/{TOUR_PROPERTY}/route", json={"from_stop_id": "unit:101"}, headers=env.auth())
    assert r.status_code == 422 and r.json()["error"]["code"] == "validation_error"


def test_cross_building_route_goes_outdoors(env: Env):
    status, body = route(env, from_stop_id="tour_start:7", to_stop_id="unit:201")
    assert status == 200, body
    kinds = [l["kind"] for l in body["route"]["legs"]]
    assert "outdoor" in kinds
    outdoor = next(s for s in body["route"]["steps"] if s["type"] == "outdoor")
    assert outdoor["title"] == "Walk outside to Tower B entrance"
    assert outdoor["description"] == "Leave by Main Tour, enter by Tower B entrance"
    assert body["route"]["buildings"] == ["A", "B"]


def test_tour_route_orders_and_segments(env: Env):
    r = env.client.post(f"/api/v1/properties/{TOUR_PROPERTY}/tour-route", json={"stop_ids": ["unit:301", "amenity:11", "unit:101", "unit:201", "unit:101"]}, headers=env.auth())
    assert r.status_code == 200, r.text
    body = r.json()
    assert [s["stop_id"] for s in body["segments"]] == ["amenity:11", "unit:101", "unit:301", "unit:201"], "building order, floor, Tour Setup sort; duplicates collapse"
    first = body["segments"][0]
    assert first["from_stop_id"] == "tour_start:7" and first["tour_stop_id"] == 3
    assert first["route"]["steps"][-1]["type"] == "arrive" and first["route"]["steps"][-1]["dwell_s"] == 180
    second = body["segments"][1]
    assert second["from_stop_id"] == "amenity:11" and second["route"]["steps"][-1]["dwell_s"] == 240
    whole = body["route"]
    assert whole["start"]["id"] == "tour_start:7" and whole["destination"]["id"] == "tour_start:7"
    assert whole["steps"][0]["title"] == "Walk on Floor 1"
    assert sum(1 for s in whole["steps"] if s["type"] == "arrive") == 5, "four stops plus the return to the start"
    assert body["skipped"] == []


def test_tour_route_skips_unreachable_stop_with_warning(env: Env):
    r = env.client.post(f"/api/v1/properties/{TOUR_PROPERTY}/tour-route", json={"stop_ids": ["unit:999", "unit:101"]}, headers=env.auth())
    assert r.status_code == 200, r.text
    body = r.json()
    assert [s["stop_id"] for s in body["segments"]] == ["unit:101"]
    assert body["skipped"] == ["unit:999"]
    assert any("Island" in w for w in body["route"]["warnings"])


def test_tour_route_rejects_stops_not_on_the_list(env: Env):
    r = env.client.post(f"/api/v1/properties/{TOUR_PROPERTY}/tour-route", json={"stop_ids": ["unit:101", "unit:102", "amenity:12", "unit:777"]}, headers=env.auth())
    assert r.status_code == 422
    body = r.json()
    assert body["error"]["code"] == "invalid_stop"
    assert body["error"]["details"]["invalid_stops"] == ["unit:102", "amenity:12", "unit:777"]


def test_distances(env: Env):
    r = env.client.post(f"/api/v1/properties/{TOUR_PROPERTY}/stops/distances", json={"stop_ids": ["unit:101", "unit:301", "unit:999", "unit:777"]}, headers=env.auth())
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["from_stop_id"] == "tour_start:7"
    d = body["distances"]
    assert d["unit:101"]["reachable"] and d["unit:101"]["direction"] == "level" and d["unit:101"]["distance"] > 0
    assert d["unit:301"]["reachable"] and d["unit:301"]["direction"] == "up"
    assert not d["unit:999"]["reachable"] and d["unit:999"]["error"]["code"] == "not_linked"
    assert not d["unit:777"]["reachable"] and d["unit:777"]["error"]["code"] == "unknown_endpoint"
