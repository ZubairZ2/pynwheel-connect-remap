from tests.conftest import NO_TOUR_PROPERTY, OTHER_PROPERTY, TOUR_PROPERTY, Env


def test_stop_from_another_property_is_rejected(env: Env):
    # OTHER_PROPERTY has the same ids in its own fixture; the stops endpoint of TOUR_PROPERTY still refuses an id that is not on its list.
    r = env.client.post(f"/api/v1/properties/{TOUR_PROPERTY}/tour-route", json={"stop_ids": ["unit:102"]}, headers=env.auth())
    assert r.status_code == 422 and r.json()["error"]["code"] == "invalid_stop"


def test_route_against_tour_disabled_property(env: Env):
    r = env.client.post(f"/api/v1/properties/{NO_TOUR_PROPERTY}/tour-route", json={"stop_ids": ["unit:101"]}, headers=env.auth())
    assert r.status_code == 422 and r.json()["error"]["code"] == "tour_disabled"


def test_non_super_admin_cannot_reach_any_property_endpoint(env: Env):
    for path in ("", "/stops", "/map", "/graph"):
        r = env.client.get(f"/api/v1/properties/{TOUR_PROPERTY}{path}", headers=env.auth("tok-manager"))
        assert r.status_code == 403, path
    r = env.client.post(f"/api/v1/properties/{TOUR_PROPERTY}/route", json={"from_stop_id": "unit:101", "to_stop_id": "unit:301"}, headers=env.auth("tok-manager"))
    assert r.status_code == 403


def test_invalid_property_ids(env: Env):
    assert env.client.get("/api/v1/properties/0", headers=env.auth()).status_code == 422
    assert env.client.get("/api/v1/properties/abc", headers=env.auth()).status_code == 422
    assert env.client.get("/api/v1/properties/424242/stops", headers=env.auth()).status_code == 404


def test_errors_never_leak_internals(env: Env, monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("SELECT secret FROM users")

    monkeypatch.setattr(env.container.stops, "list", boom)
    r = env.client.get(f"/api/v1/properties/{TOUR_PROPERTY}/stops", headers=env.auth())
    assert r.status_code == 500
    body = r.json()
    assert body["error"]["code"] == "internal_error"
    assert "SELECT" not in r.text and "users" not in r.text and "ref" in body["error"]["details"]


def test_other_property_is_isolated(env: Env):
    r = env.client.get(f"/api/v1/properties/{OTHER_PROPERTY}/graph", headers=env.auth())
    assert r.status_code == 200
    assert r.json()["community_id"] == OTHER_PROPERTY and r.json()["version"] == "wf-300-test"
