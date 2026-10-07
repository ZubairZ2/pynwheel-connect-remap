from tests.conftest import TOUR_PROPERTY, Env


def test_map_levels_and_buildings(env: Env):
    r = env.client.get(f"/api/v1/properties/{TOUR_PROPERTY}/map", headers=env.auth())
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["graph_version"] == "wf-100-test"
    assert [l["id"] for l in body["levels"]] == ["floorplate:1", "floorplate:3", "floorplate:2"], "levels sort by lowest floor, then id"
    first = body["levels"][0]
    assert first["floors"] == [1, 2, 3] and first["building"] == "A" and first["space"] == "raster"
    assert first["image"] == "https://bucket.s3-accelerate.amazonaws.com/uploads/floorplate/image/1/a.png"
    assert first["svg"] is None and first["width"] == 760 and first["height"] == 470
    second = body["levels"][2]
    assert second["svg"] == "https://bucket.s3-accelerate.amazonaws.com/uploads/floorplate/svg_image/2/b.svg"
    assert body["buildings"] == [{"name": "A", "level_ids": ["floorplate:1", "floorplate:2"]}, {"name": "B", "level_ids": ["floorplate:3"]}]


def test_level_detail(env: Env):
    r = env.client.get(f"/api/v1/properties/{TOUR_PROPERTY}/map/levels/floorplate:2", headers=env.auth())
    assert r.status_code == 200
    body = r.json()
    assert body["level"]["id"] == "floorplate:2"
    assert all(n["level"] == "floorplate:2" for n in body["nodes"])
    kinds = sorted(n["kind"] for n in body["nodes"])
    assert kinds == ["elevator", "hallway", "hallway"]
    assert all(e["level"] == "floorplate:2" for e in body["edges"]) and len(body["edges"]) == 1
    r = env.client.get(f"/api/v1/properties/{TOUR_PROPERTY}/map/levels/floorplate:77", headers=env.auth())
    assert r.status_code == 404 and r.json()["error"]["code"] == "unknown_level"


def test_graph_payload_and_etag(env: Env):
    r = env.client.get(f"/api/v1/properties/{TOUR_PROPERTY}/graph", headers=env.auth())
    assert r.status_code == 200, r.text
    assert r.headers["ETag"] == '"wf-100-test"'
    body = r.json()
    assert body["version"] == "wf-100-test" and body["community_id"] == TOUR_PROPERTY
    nodes = {(n["id"], n["level"]): n for n in body["nodes"]}
    unit = nodes[("unit:101", "floorplate:1")]
    assert unit["anchor"] == "point" and unit["attach"] == "hallway:2" and unit["link"] == "nearest" and unit["floor"] == 1
    hallway = nodes[("hallway:1", "floorplate:1")]
    assert hallway["anchor"] == "icon_top_left" and hallway["x"] == 100 and hallway["floor"] is None
    lift_levels = sorted(level for (nid, level) in nodes if nid == "elevator:50")
    assert lift_levels == ["floorplate:1", "floorplate:2"], "the lift serves both plates, once per level"
    assert nodes[("elevator:50", "floorplate:1")]["floors_served"] == [1, 2, 3, 4, 5]
    assert nodes[("elevator:51", "floorplate:1")]["vertical"] == "stairs"
    assert {v["id"]: v["kind"] for v in body["vertical_connections"]} == {"elevator:50": "elevator", "elevator:51": "stairs"}
    assert {g["id"] for g in body["gates"]} == {"bsp:70", "tour_start:7"}
    assert body["tour"]["start"] == "tour_start:7" and len(body["tour"]["stops"]) == 9
    assert any(e["from"] == "hallway:1" and e["to"] == "hallway:2" and e["polyline"] == [[108, 108], [308, 108]] for e in body["edges"])
    assert "access_code" not in r.text
    r2 = env.client.get(f"/api/v1/properties/{TOUR_PROPERTY}/graph", headers={**env.auth(), "If-None-Match": '"wf-100-test"'})
    assert r2.status_code == 304
