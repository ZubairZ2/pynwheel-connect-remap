from tests.conftest import NO_TOUR_PROPERTY, OTHER_PROPERTY, TOUR_PROPERTY, Env


def test_property_list(env: Env):
    r = env.client.get("/api/v1/properties", headers=env.auth())
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 3
    names = [p["name"] for p in body["properties"]]
    assert names == ["Other Property", "Quiet Property", "Tour Property"]
    quiet = next(p for p in body["properties"] if p["id"] == NO_TOUR_PROPERTY)
    assert quiet["tour_enabled"] is False
    assert set(quiet) == {"id", "name", "address", "city", "state", "zip", "company", "tour_enabled", "is_sitemap"}


def test_property_list_filters(env: Env):
    r = env.client.get("/api/v1/properties", params={"tour_enabled": "true"}, headers=env.auth())
    assert [p["id"] for p in r.json()["properties"]] == [OTHER_PROPERTY, TOUR_PROPERTY]
    r = env.client.get("/api/v1/properties", params={"q": "denver"}, headers=env.auth())
    assert [p["id"] for p in r.json()["properties"]] == [TOUR_PROPERTY]


def test_property_detail_tour_enabled(env: Env):
    r = env.client.get(f"/api/v1/properties/{TOUR_PROPERTY}", headers=env.auth())
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["tour_enabled"] is True
    assert body["graph_version"] == "wf-100-test"
    assert body["buildings"] == ["A", "B"]
    assert body["tour"]["start_node"] == "tour_start:7"
    assert body["tour"]["starting_floor"] == 1
    assert body["tour"]["stops_total"] == 5  # 101, 301, 201, Island (units) + Gym; not 102 (hidden), Pool (flag off), the elevator, or the duplicate


def test_property_detail_tour_disabled(env: Env):
    r = env.client.get(f"/api/v1/properties/{NO_TOUR_PROPERTY}", headers=env.auth())
    assert r.status_code == 200
    body = r.json()
    assert body["tour_enabled"] is False
    assert body["tour"] is None and body["graph_version"] is None


def test_unknown_property(env: Env):
    r = env.client.get("/api/v1/properties/999999", headers=env.auth())
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "not_found"


def test_tour_disabled_property_refuses_tour_endpoints(env: Env):
    for path in ("stops", "map", "graph"):
        r = env.client.get(f"/api/v1/properties/{NO_TOUR_PROPERTY}/{path}", headers=env.auth())
        assert r.status_code == 422, path
        assert r.json()["error"]["code"] == "tour_disabled"
    r = env.client.post(f"/api/v1/properties/{NO_TOUR_PROPERTY}/route", json={"from_stop_id": "unit:1", "to_stop_id": "unit:2"}, headers=env.auth())
    assert r.status_code == 422 and r.json()["error"]["code"] == "tour_disabled"


def test_health(env: Env):
    r = env.client.get("/api/v1/health")
    assert r.status_code == 200
    assert r.json()["database"] is True
