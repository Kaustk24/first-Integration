"""
Comprehensive Unit & Integration Tests for Automated Headless FYERS TOTP Authentication,
Concurrency Locks, Cooldowns, Token Persistence, and Safe API Status Reporting.
"""
import base64
import json
import threading
import time
from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient

from config.settings import FYERS
from services.fyers_auth import (
    FyersTokenManager,
    FYERS_AUTHENTICATED,
    FYERS_CONNECTING,
    FYERS_REAUTH_REQUIRED,
    FYERS_AUTH_ERROR,
)
from api.app import app

client = TestClient(app)


@pytest.fixture
def mock_fyers_env(monkeypatch, tmp_path):
    """Sets up a clean temporary environment for FYERS credentials and token storage."""
    token_file = tmp_path / "fyers_tokens.json"
    temp_env_file = tmp_path / ".env"
    temp_env_file.write_text(
        "FYERS_APP_ID=TEST_APP_123-100\n"
        "FYERS_SECRET_KEY=TEST_SECRET_ABCXYZ\n"
        "FYERS_CLIENT_ID=TEST_CLIENT_ID\n"
        "FYERS_PIN=1234\n"
        "FYERS_TOTP_KEY=JBSWY3DPEHPK3PXP\n"
        "FYERS_REDIRECT_URL=http://127.0.0.1:8000/fyers/callback\n"
    )

    from config import settings
    from services import fyers_auth

    monkeypatch.setattr(settings, "ENV_PATH", temp_env_file)
    monkeypatch.setattr(fyers_auth, "ENV_PATH", temp_env_file)

    monkeypatch.setenv("FYERS_APP_ID", "TEST_APP_123-100")
    monkeypatch.setenv("FYERS_SECRET_KEY", "TEST_SECRET_ABCXYZ")
    monkeypatch.setenv("FYERS_CLIENT_ID", "TEST_CLIENT_ID")
    monkeypatch.setenv("FYERS_PIN", "1234")
    monkeypatch.setenv("FYERS_TOTP_KEY", "JBSWY3DPEHPK3PXP")
    monkeypatch.setenv("FYERS_REDIRECT_URL", "http://127.0.0.1:8000/fyers/callback")

    monkeypatch.setattr(FYERS, "token_store_path", token_file)
    FYERS.reload()
    return token_file


def test_valid_stored_token_startup(mock_fyers_env):
    """Test 1: When stored access token is valid, backend startup uses it directly without calling TOTP login."""
    tm = FyersTokenManager()
    tm.token_store_path = mock_fyers_env

    # Pre-save a valid token that expires in 12 hours
    tm.save_tokens("active_valid_token_xyz", "refresh_token_abc", expires_in=43200)

    with patch.object(tm, "login_with_totp") as mock_totp:
        status = tm.reload_and_verify(auto_totp=True)
        assert status == FYERS_AUTHENTICATED
        assert tm.is_access_token_valid() is True
        assert tm.access_token == "active_valid_token_xyz"
        mock_totp.assert_not_called()


def test_expired_token_triggers_totp_login(mock_fyers_env):
    """Test 2: When stored token is expired, reload_and_verify with auto_totp=True triggers TOTP login."""
    tm = FyersTokenManager()
    tm.token_store_path = mock_fyers_env

    # Save an expired token
    tm.save_tokens("expired_token_xyz", "expired_refresh_token", expires_in=-100)
    assert tm.is_access_token_valid() is False

    with patch.object(tm, "start_background_login") as mock_bg_login, \
         patch.object(tm, "refresh_access_token", return_value=False):
        tm.reload_and_verify(auto_totp=True)
        mock_bg_login.assert_called_once()


def test_successful_totp_authentication(mock_fyers_env):
    """Test 3: Complete 7-step TOTP flow succeeds: sends OTP, verifies TOTP, verifies PIN, gets auth_code, generates token."""
    tm = FyersTokenManager()
    tm.token_store_path = mock_fyers_env
    tm.access_token = ""
    tm.refresh_token = ""

    # Mock HTTP session requests for steps 1-5
    def mock_requests_post(url, *args, **kwargs):
        mock_resp = MagicMock()
        mock_resp.status_code = 200

        if "send_login_otp" in url:
            mock_resp.json.return_value = {"s": "ok", "request_key": "rk_step1_abc"}
        elif "verify_otp" in url:
            # Verify request contains request_key and 6-digit OTP
            json_body = kwargs.get("json", {})
            assert json_body.get("request_key") == "rk_step1_abc"
            assert len(str(json_body.get("otp"))) == 6
            mock_resp.json.return_value = {"s": "ok", "request_key": "rk_step2_def"}
        elif "verify_pin" in url:
            json_body = kwargs.get("json", {})
            assert json_body.get("request_key") == "rk_step2_def"
            mock_resp.json.return_value = {"s": "ok", "data": {"access_token": "bearer_jwt_step4"}}
        elif "generate-authcode" in url or "api/v2/token" in url:
            headers = kwargs.get("headers", {})
            assert "Bearer bearer_jwt_step4" in headers.get("authorization", "")
            mock_resp.status_code = 308
            mock_resp.json.return_value = {
                "Url": "http://127.0.0.1:8000/fyers/callback?s=ok&code=200&auth_code=auth_code_step5_success"
            }
        return mock_resp

    # Mock SessionModel token exchange (step 6)
    mock_session_instance = MagicMock()
    mock_session_instance.generate_token.return_value = {
        "s": "ok",
        "access_token": "newly_minted_access_token_999",
        "refresh_token": "newly_minted_refresh_token_888",
        "expires_in": 86400
    }

    with patch("requests.Session.post", side_effect=mock_requests_post), \
         patch("fyers_apiv3.fyersModel.SessionModel", return_value=mock_session_instance):

        success = tm.login_with_totp(force=True)
        assert success is True
        assert tm.status == FYERS_AUTHENTICATED
        assert tm.access_token == "newly_minted_access_token_999"
        assert tm.refresh_token == "newly_minted_refresh_token_888"
        assert tm.is_access_token_valid() is True

        # Verify saved to token file
        assert mock_fyers_env.exists()
        with open(mock_fyers_env, "r") as f:
            data = json.load(f)
            assert data["access_token"] == "newly_minted_access_token_999"
            assert data["refresh_token"] == "newly_minted_refresh_token_888"


def test_failed_totp_authentication_handles_error(mock_fyers_env):
    """Test 4: Failed TOTP authentication sets status to FYERS_AUTH_ERROR, records last_error without throwing unhandled exception."""
    tm = FyersTokenManager()
    tm.token_store_path = mock_fyers_env

    def mock_failing_post(url, *args, **kwargs):
        mock_resp = MagicMock()
        mock_resp.status_code = 400
        mock_resp.text = "Invalid OTP verification code"
        return mock_resp

    with patch("requests.Session.post", side_effect=mock_failing_post):
        success = tm.login_with_totp(force=True)
        assert success is False
        assert tm.status == FYERS_AUTH_ERROR
        assert "Step 1 failed" in tm.last_error or "Invalid" in tm.last_error


def test_concurrent_login_lock_prevents_duplicate_runs(mock_fyers_env):
    """Test 5: Concurrency lock prevents multiple concurrent threads from running separate TOTP flows simultaneously."""
    tm = FyersTokenManager()
    tm.token_store_path = mock_fyers_env

    flow_count = 0
    flow_lock = threading.Lock()

    def slow_mock_post(url, *args, **kwargs):
        nonlocal flow_count
        with flow_lock:
            if "send_login_otp" in url:
                flow_count += 1
        time.sleep(0.05)  # Simulate network latency
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        if "send_login_otp" in url:
            mock_resp.json.return_value = {"s": "ok", "request_key": "rk1"}
        elif "verify_otp" in url:
            mock_resp.json.return_value = {"s": "ok", "request_key": "rk2"}
        elif "verify_pin" in url:
            mock_resp.json.return_value = {"s": "ok", "data": {"access_token": "bearer1"}}
        elif "generate-authcode" in url or "api/v2/token" in url:
            mock_resp.json.return_value = {"Url": "http://127.0.0.1:8000/fyers/callback?auth_code=code123"}
        return mock_resp

    mock_session = MagicMock()
    mock_session.generate_token.return_value = {
        "s": "ok",
        "access_token": "concurrent_access_token",
        "refresh_token": "concurrent_refresh_token",
        "expires_in": 86400
    }

    threads = []
    results = []

    def worker():
        res = tm.login_with_totp(force=True)
        results.append(res)

    with patch("requests.Session.post", side_effect=slow_mock_post), \
         patch("fyers_apiv3.fyersModel.SessionModel", return_value=mock_session):

        for _ in range(5):
            t = threading.Thread(target=worker)
            threads.append(t)
            t.start()

        for t in threads:
            t.join()

    # Verify only 1 network authentication sequence was started across all 5 threads
    assert flow_count == 1
    assert tm.status == FYERS_AUTHENTICATED


def test_token_persistence_and_client_reinit_callback(mock_fyers_env):
    """Test 6: Registered callbacks are triggered when tokens are saved."""
    tm = FyersTokenManager()
    tm.token_store_path = mock_fyers_env

    callback_called = False

    def on_reauth():
        nonlocal callback_called
        callback_called = True

    tm.register_reauth_callback(on_reauth)
    tm.save_tokens("test_token_callback", "test_refresh_callback")

    assert callback_called is True
    assert tm.status == FYERS_AUTHENTICATED


def test_safe_api_endpoints_never_expose_secrets(mock_fyers_env):
    """Test 7: No secrets, PIN, TOTP key, or access tokens appear in API responses."""
    response = client.get("/api/fyers-status")
    assert response.status_code == 200
    data = response.json()

    # Check expected safe keys
    assert "is_authenticated" in data
    assert "status" in data
    assert "headless_login_configured" in data
    assert "has_access_token" in data
    assert "has_refresh_token" in data
    assert "last_error" in data

    # Verify NO secrets or credentials in response
    assert "secret_key" not in data
    assert "FYERS_SECRET_KEY" not in data
    assert "pin" not in data
    assert "FYERS_PIN" not in data
    assert "totp_key" not in data
    assert "FYERS_TOTP_KEY" not in data
    assert "access_token" not in data
    assert "refresh_token" not in data

    # Also check /health endpoint
    health_resp = client.get("/health")
    assert health_resp.status_code == 200
    health_data = health_resp.json()
    fyers_conn = health_data.get("fyers_connection", {})
    assert "secret_key" not in fyers_conn
    assert "access_token" not in fyers_conn
    assert "pin" not in fyers_conn
    assert "totp_key" not in fyers_conn
