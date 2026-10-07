from tests.conftest import Env


def test_login_super_admin(env: Env):
    r = env.client.post("/api/v1/auth/login", json={"email": "super@example.test", "password": "password"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["success"] is True
    assert body["access_token"] == "tok-super"
    assert body["token_type"] == "bearer"
    assert body["user"] == {"id": 1, "name": "Super Admin", "email": "super@example.test", "role": "super_admin"}
    assert "encrypted_password" not in r.text and "password" not in body["user"]


def test_login_wrong_password(env: Env):
    r = env.client.post("/api/v1/auth/login", json={"email": "super@example.test", "password": "nope"})
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "invalid_credentials"


def test_login_unknown_user(env: Env):
    r = env.client.post("/api/v1/auth/login", json={"email": "nobody@example.test", "password": "password"})
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "invalid_credentials"


def test_login_non_super_admin_is_refused_and_token_revoked(env: Env):
    r = env.client.post("/api/v1/auth/login", json={"email": "manager@example.test", "password": "password"})
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "not_super_admin"
    assert "access_token" not in r.text
    assert env.rails.revoked == ["tok-manager"]


def test_login_inactive_user(env: Env):
    r = env.client.post("/api/v1/auth/login", json={"email": "gone@example.test", "password": "password"})
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "inactive_user"


def test_login_validation(env: Env):
    r = env.client.post("/api/v1/auth/login", json={"email": "not-an-email", "password": "x"})
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "validation_error"


def test_login_when_rails_is_down(env: Env):
    env.rails.down = True
    r = env.client.post("/api/v1/auth/login", json={"email": "super@example.test", "password": "password"})
    assert r.status_code == 503
    assert r.json()["error"]["code"] == "upstream_unavailable"


def test_missing_token(env: Env):
    r = env.client.get("/api/v1/properties")
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "unauthorized"
    assert r.headers["WWW-Authenticate"] == "Bearer"


def test_invalid_token(env: Env):
    r = env.client.get("/api/v1/properties", headers=env.auth("tok-made-up"))
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "invalid_token"


def test_malformed_authorization_header(env: Env):
    r = env.client.get("/api/v1/properties", headers={"Authorization": "Basic abc"})
    assert r.status_code == 401


def test_expired_token(env: Env):
    r = env.client.get("/api/v1/properties", headers=env.auth("tok-expired"))
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "token_expired"


def test_revoked_token(env: Env):
    r = env.client.get("/api/v1/properties", headers=env.auth("tok-revoked"))
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "token_revoked"


def test_token_without_user(env: Env):
    r = env.client.get("/api/v1/properties", headers=env.auth("tok-orphan"))
    assert r.status_code == 401


def test_non_super_admin_token(env: Env):
    r = env.client.get("/api/v1/properties", headers=env.auth("tok-manager"))
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "not_super_admin"


def test_me_and_logout(env: Env):
    r = env.client.get("/api/v1/auth/me", headers=env.auth())
    assert r.status_code == 200
    assert r.json()["user"]["role"] == "super_admin"
    r = env.client.post("/api/v1/auth/logout", headers=env.auth())
    assert r.status_code == 200
    assert r.json() == {"success": True, "revoked": True}
    assert env.rails.revoked == ["tok-super"]
