"""The Doorkeeper client against a mocked CMS: every answer shape the token endpoint gives."""
import httpx
import pytest

from app.errors import ApiError
from app.integrations.rails import REVOKE_PATH, TOKEN_PATH, RailsAuthClient


def client_with(handler) -> RailsAuthClient:
    return RailsAuthClient("http://cms.test", transport=httpx.MockTransport(handler))


def test_password_grant_success():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == TOKEN_PATH
        assert b"grant_type=password" in request.content and b"email=super%40example.test" in request.content
        return httpx.Response(200, json={"access_token": "abc", "token_type": "Bearer", "expires_in": 432000, "created_at": 1791215352, "success": True})

    granted = client_with(handler).password_grant("super@example.test", "pw")
    assert granted.access_token == "abc" and granted.expires_in == 432000


def test_password_grant_wrong_password():
    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(400, json={"success": False, "status_code": 401, "message": "Invalid email or password.", "result": []})

    with pytest.raises(ApiError) as exc:
        client_with(handler).password_grant("super@example.test", "nope")
    assert exc.value.status == 401 and exc.value.code == "invalid_credentials"


def test_password_grant_non_portal_account_is_refused_by_the_cms():
    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"success": False, "status_code": 401, "message": "Unauthorized. You don't have permission to access this area or content", "user_details": []})

    with pytest.raises(ApiError) as exc:
        client_with(handler).password_grant("manager@example.test", "pw")
    assert exc.value.status == 403 and exc.value.code == "not_authorized_account"


def test_password_grant_when_cms_is_down():
    def handler(_: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("refused")

    with pytest.raises(ApiError) as exc:
        client_with(handler).password_grant("super@example.test", "pw")
    assert exc.value.status == 503 and exc.value.code == "upstream_unavailable"


def test_revoke():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["path"] = request.url.path
        return httpx.Response(200, json={})

    assert client_with(handler).revoke("abc") is True
    assert seen["path"] == REVOKE_PATH
