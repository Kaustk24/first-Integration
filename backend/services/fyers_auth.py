"""
Official FYERS API v3 Token Authentication Manager & State Machine.
Handles headless TOTP 2FA automated login, token persistence, automatic refresh-token renewal,
concurrency locking, retry cooldowns, and safe auth state reporting.
"""
from __future__ import annotations

import base64
import json
import logging
import threading
import time
from pathlib import Path
from typing import Dict, Any, Callable, List
from urllib.parse import urlparse, parse_qs

import requests
import pyotp

from config.settings import FYERS, BASE_DIR, ENV_PATH

logger = logging.getLogger(__name__)

# Authentication States
FYERS_AUTHENTICATED = "FYERS_AUTHENTICATED"
FYERS_CONNECTING = "CONNECTING"
FYERS_TOKEN_EXPIRED = "FYERS_TOKEN_EXPIRED"
FYERS_REAUTH_REQUIRED = "FYERS_REAUTH_REQUIRED"
FYERS_AUTH_ERROR = "FYERS_AUTH_ERROR"


def _update_env_file(updates: Dict[str, str]):
    """Helper to safely update key=value pairs in backend/.env without corrupting existing lines."""
    env_path = ENV_PATH
    lines = []
    if env_path.exists():
        with open(env_path, "r") as f:
            lines = f.readlines()

    updated_keys = set()
    new_lines = []
    for line in lines:
        stripped = line.strip()
        matched_key = None
        for key in updates:
            if stripped.startswith(f"{key}="):
                matched_key = key
                break

        if matched_key:
            updated_keys.add(matched_key)
            val = updates[matched_key].strip()
            if val:
                new_lines.append(f"{matched_key}={val}\n")
        else:
            new_lines.append(line)

    for key, val in updates.items():
        if key not in updated_keys and val.strip():
            new_lines.append(f"{key}={val.strip()}\n")

    with open(env_path, "w") as f:
        f.writelines(new_lines)


class FyersTokenManager:
    """Manages the server-side lifecycle of FYERS access and refresh tokens,

    including automated headless TOTP authentication.
    """

    def __init__(self):
        self.token_store_path = FYERS.token_store_path
        self.token_store_path.parent.mkdir(parents=True, exist_ok=True)

        self.access_token: str = ""
        self.refresh_token: str = ""
        self.expires_at: float = 0.0
        self.status: str = FYERS_REAUTH_REQUIRED
        self.last_error: str = ""

        # Concurrency lock & cooldown to prevent concurrent or repeated login loops
        self._login_lock = threading.Lock()
        self._last_login_attempt: float = 0.0
        self._cooldown_seconds: float = 30.0
        self._reauth_callbacks: List[Callable[[], None]] = []

        self.reload_and_verify(auto_totp=False)

    def register_reauth_callback(self, callback: Callable[[], None]):
        """Registers a callback function to be executed whenever new tokens are obtained."""
        if callback not in self._reauth_callbacks:
            self._reauth_callbacks.append(callback)

    def _notify_callbacks(self):
        """Invokes registered callbacks (e.g. to reinitialize REST & WebSocket clients)."""
        for cb in self._reauth_callbacks:
            try:
                cb()
            except Exception as e:
                logger.warning("Error executing FYERS reauth callback: %s", e)

    def load_tokens(self) -> bool:
        """Loads stored tokens from server-side JSON store or environment variables."""
        FYERS.reload()
        # 1. Check local JSON store
        if self.token_store_path.exists():
            try:
                with open(self.token_store_path, "r") as f:
                    data = json.load(f)
                    self.access_token = data.get("access_token", "").strip()
                    self.refresh_token = data.get("refresh_token", "").strip()
                    self.expires_at = float(data.get("expires_at", 0.0))
            except Exception as e:
                logger.warning("Error reading server-side token store: %s", e)

        # 2. Fallback to .env if JSON store empty
        if not self.access_token and FYERS.access_token:
            self.access_token = FYERS.access_token
        if not self.refresh_token and FYERS.refresh_token:
            self.refresh_token = FYERS.refresh_token

        return bool(self.access_token or self.refresh_token)

    def save_tokens(self, access_token: str, refresh_token: str = "", expires_in: int = 86400):
        """Persists access token and refresh token server-side and updates environment file."""
        self.access_token = access_token.strip()
        if refresh_token.strip():
            self.refresh_token = refresh_token.strip()

        self.expires_at = time.time() + float(expires_in)

        # Save to server-side JSON file (never exposed to frontend/git)
        token_data = {
            "access_token": self.access_token,
            "refresh_token": self.refresh_token,
            "expires_at": self.expires_at,
            "updated_at": time.time()
        }
        with open(self.token_store_path, "w") as f:
            json.dump(token_data, f, indent=2)

        # Sync to .env for fallback
        env_updates = {"FYERS_ACCESS_TOKEN": self.access_token}
        if self.refresh_token:
            env_updates["FYERS_REFRESH_TOKEN"] = self.refresh_token
        _update_env_file(env_updates)
        FYERS.reload()

        self.status = FYERS_AUTHENTICATED
        self.last_error = ""
        logger.info("[INFO] FYERS authentication loaded & tokens securely saved server-side.")

        # Reinitialize registered REST & WebSocket clients
        self._notify_callbacks()

    def is_access_token_valid(self) -> bool:
        """Returns True if access token is present and not expired (with 5-minute safety buffer)."""
        if not self.access_token:
            return False
        if self.expires_at > 0 and time.time() >= (self.expires_at - 300):
            return False
        return True

    def refresh_access_token(self) -> bool:
        """Attempts automatic access token renewal using stored refresh token via official FYERS API."""
        FYERS.reload()
        if not FYERS.app_id or not FYERS.secret_key:
            self.status = FYERS_REAUTH_REQUIRED
            self.last_error = "Missing FYERS_APP_ID or FYERS_SECRET_KEY in environment."
            logger.warning("[WARNING] Cannot refresh FYERS token: missing App ID or Secret Key.")
            return False

        if not self.refresh_token:
            self.status = FYERS_REAUTH_REQUIRED
            self.last_error = "No refresh token available server-side."
            logger.info("[INFO] Refresh token not present server-side. Re-authentication required.")
            return False

        try:
            logger.info("[INFO] Access token expired. Refreshing FYERS access token automatically...")
            from fyers_apiv3 import fyersModel

            session = fyersModel.SessionModel(
                client_id=FYERS.app_id,
                secret_key=FYERS.secret_key,
                redirect_uri=FYERS.redirect_url,
                response_type="code",
                grant_type="refresh_token"
            )
            session.set_token(self.refresh_token)
            response = session.generate_token()

            if isinstance(response, dict) and response.get("s") == "ok" and response.get("access_token"):
                new_access_token = response["access_token"]
                new_refresh_token = response.get("refresh_token", self.refresh_token)
                expires_in = response.get("expires_in", 86400)
                self.save_tokens(new_access_token, new_refresh_token, expires_in=expires_in)
                logger.info("[INFO] FYERS access token refreshed successfully!")
                return True
            else:
                error_msg = response.get("message", str(response)) if isinstance(response, dict) else str(response)
                logger.info("[INFO] FYERS refresh token expired or invalid (%s).", error_msg)
                self.status = FYERS_REAUTH_REQUIRED
                self.last_error = f"Re-authentication required: {error_msg}"
                return False
        except Exception as e:
            logger.error("[ERROR] Token refresh failed: %s", e)
            self.status = FYERS_AUTH_ERROR
            self.last_error = str(e)
            return False

    def login_with_totp(self, force: bool = False) -> bool:
        """Performs complete automatic headless FYERS authentication using TOTP and PIN.

        Follows the 7-step sequence:
        1. Send login OTP request.
        2. Generate current TOTP code using pyotp.
        3. Verify TOTP code.
        4. Verify FYERS PIN.
        5. Request authorization code.
        6. Exchange authorization code for access token and refresh token.
        7. Save tokens in server-side token store and notify clients.
        """
        FYERS.reload()

        # Check required credentials
        if not FYERS.is_headless_login_configured():
            missing = []
            if not FYERS.app_id: missing.append("FYERS_APP_ID")
            if not FYERS.secret_key: missing.append("FYERS_SECRET_KEY")
            if not FYERS.client_id: missing.append("FYERS_CLIENT_ID")
            if not FYERS.pin: missing.append("FYERS_PIN")
            if not FYERS.totp_key: missing.append("FYERS_TOTP_KEY")
            msg = f"FYERS headless credentials missing: {', '.join(missing)}"
            self.status = FYERS_REAUTH_REQUIRED
            self.last_error = msg
            logger.warning("[WARNING] Cannot perform automatic TOTP login: %s", msg)
            return False

        # Cooldown check to prevent hammering endpoints on failure
        now = time.time()
        if not force and (now - self._last_login_attempt) < self._cooldown_seconds:
            remaining = int(self._cooldown_seconds - (now - self._last_login_attempt))
            logger.warning("[WARNING] FYERS TOTP login attempt throttled by cooldown (%ds remaining)", remaining)
            return self.is_access_token_valid()

        # Concurrency protection: only one login attempt executes at a time
        if not self._login_lock.acquire(blocking=False):
            logger.info("[INFO] FYERS TOTP login is already in progress. Waiting on active attempt...")
            with self._login_lock:
                return self.is_access_token_valid()

        try:
            self._last_login_attempt = time.time()
            self.status = FYERS_CONNECTING
            logger.info("[INFO] Initiating automated FYERS TOTP authentication sequence...")

            session_http = requests.Session()
            session_http.headers.update({
                "Accept": "application/json",
                "Accept-Language": "en-US,en;q=0.9",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            })

            # Step 1: Send login OTP request
            encoded_fy_id = base64.b64encode(FYERS.client_id.encode()).decode()
            otp_res = None
            try:
                r1 = session_http.post(
                    "https://api-t2.fyers.in/vagator/v2/send_login_otp_v2",
                    json={"fy_id": encoded_fy_id, "app_id": "2"},
                    timeout=15
                )
                if r1.status_code == 200 and r1.json().get("request_key"):
                    otp_res = r1.json()
            except Exception as e:
                logger.debug("send_login_otp_v2 attempt notice: %s", e)

            if not otp_res or not otp_res.get("request_key"):
                r1 = session_http.post(
                    "https://api-t2.fyers.in/vagator/v2/send_login_otp",
                    json={"fy_id": FYERS.client_id, "app_id": "2"},
                    timeout=15
                )
                if r1.status_code != 200:
                    raise RuntimeError(f"Step 1 failed (send_login_otp status {r1.status_code}): {r1.text}")
                otp_res = r1.json()

            request_key = otp_res.get("request_key")
            if not request_key:
                raise RuntimeError(f"Step 1 failed: Missing request_key in OTP response: {otp_res}")

            # Step 2: Generate the current TOTP code using pyotp
            totp = pyotp.TOTP(FYERS.totp_key)
            totp_code = totp.now()

            # Step 3: Verify the TOTP code
            r2 = session_http.post(
                "https://api-t2.fyers.in/vagator/v2/verify_otp",
                json={"request_key": request_key, "otp": totp_code},
                timeout=15
            )
            if r2.status_code != 200:
                raise RuntimeError(f"Step 3 failed (verify_otp status {r2.status_code}): {r2.text}")
            r2_data = r2.json()
            request_key_2 = r2_data.get("request_key")
            if not request_key_2:
                raise RuntimeError(f"Step 3 failed: No request_key in verify_otp response: {r2_data}")

            # Step 4: Verify the FYERS PIN
            encoded_pin = base64.b64encode(str(FYERS.pin).encode()).decode()
            bearer_token = None
            try:
                r3 = session_http.post(
                    "https://api-t2.fyers.in/vagator/v2/verify_pin_v2",
                    json={"request_key": request_key_2, "identity_type": "pin", "identifier": encoded_pin},
                    timeout=15
                )
                if r3.status_code == 200:
                    r3_data = r3.json()
                    bearer_token = r3_data.get("data", {}).get("access_token") or r3_data.get("data", {}).get("token")
            except Exception as e:
                logger.debug("verify_pin_v2 attempt notice: %s", e)

            if not bearer_token:
                r3 = session_http.post(
                    "https://api-t2.fyers.in/vagator/v2/verify_pin",
                    json={"request_key": request_key_2, "identity_type": "pin", "identifier": str(FYERS.pin)},
                    timeout=15
                )
                if r3.status_code != 200:
                    raise RuntimeError(f"Step 4 failed (verify_pin status {r3.status_code}): {r3.text}")
                r3_data = r3.json()
                bearer_token = r3_data.get("data", {}).get("access_token") or r3_data.get("data", {}).get("token") or r3_data.get("token")

            if not bearer_token:
                raise RuntimeError("Step 4 failed: Missing bearer token after PIN verification")

            # Step 5: Request the authorization code
            auth_headers = {
                "authorization": f"Bearer {bearer_token}",
                "content-type": "application/json; charset=UTF-8"
            }
            app_id_prefix = FYERS.app_id.split('-')[0] if '-' in FYERS.app_id else FYERS.app_id
            auth_payload = {
                "fyers_id": FYERS.client_id,
                "app_id": app_id_prefix,
                "redirect_uri": FYERS.redirect_url,
                "appType": "100",
                "code_challenge": "",
                "state": "None",
                "scope": "",
                "nonce": "",
                "response_type": "code",
                "create_cookie": True
            }

            auth_code = None
            try:
                r4 = session_http.post(
                    "https://api-t1.fyers.in/api/v3/generate-authcode",
                    headers=auth_headers,
                    json=auth_payload,
                    timeout=15,
                    allow_redirects=False
                )
                if r4.status_code in [200, 308]:
                    try:
                        url_val = r4.json().get("Url") or r4.json().get("url")
                        if url_val:
                            parsed = urlparse(url_val)
                            auth_code = parse_qs(parsed.query).get("auth_code", [None])[0]
                        elif r4.json().get("auth_code"):
                            auth_code = r4.json().get("auth_code")
                    except Exception:
                        pass
                if not auth_code and "Location" in r4.headers:
                    parsed = urlparse(r4.headers["Location"])
                    auth_code = parse_qs(parsed.query).get("auth_code", [None])[0]
            except Exception as e:
                logger.debug("api-t1 generate-authcode notice: %s", e)

            # Fallback to v2 token endpoint if auth_code not yet obtained
            if not auth_code:
                r4_v2 = session_http.post(
                    "https://api.fyers.in/api/v2/token",
                    headers=auth_headers,
                    json=auth_payload,
                    timeout=15,
                    allow_redirects=False
                )
                if r4_v2.status_code in [200, 308]:
                    try:
                        url_val = r4_v2.json().get("Url") or r4_v2.json().get("url")
                        if url_val:
                            parsed = urlparse(url_val)
                            auth_code = parse_qs(parsed.query).get("auth_code", [None])[0]
                        elif r4_v2.json().get("auth_code"):
                            auth_code = r4_v2.json().get("auth_code")
                    except Exception:
                        pass
                if not auth_code and "Location" in r4_v2.headers:
                    parsed = urlparse(r4_v2.headers["Location"])
                    auth_code = parse_qs(parsed.query).get("auth_code", [None])[0]

            if not auth_code:
                raise RuntimeError("Step 5 failed: Could not extract auth_code from FYERS authorization response")

            # Step 6: Exchange authorization code for access token & refresh token
            from fyers_apiv3 import fyersModel

            session = fyersModel.SessionModel(
                client_id=FYERS.app_id,
                secret_key=FYERS.secret_key,
                redirect_uri=FYERS.redirect_url,
                response_type="code",
                grant_type="authorization_code"
            )
            session.set_token(auth_code)
            token_response = session.generate_token()

            if isinstance(token_response, dict) and token_response.get("s") == "ok" and token_response.get("access_token"):
                # Step 7: Save the tokens in server-side token store
                access_token = token_response["access_token"]
                refresh_token = token_response.get("refresh_token", "")
                expires_in = token_response.get("expires_in", 86400)
                self.save_tokens(access_token, refresh_token, expires_in=expires_in)
                self.status = FYERS_AUTHENTICATED
                self.last_error = ""
                logger.info("[INFO] FYERS TOTP authentication succeeded and tokens saved server-side.")
                return True
            else:
                msg = token_response.get("message", str(token_response)) if isinstance(token_response, dict) else str(token_response)
                raise RuntimeError(f"Step 6 token exchange failed: {msg}")

        except Exception as e:
            logger.error("[ERROR] Automated FYERS TOTP login failed: %s", e)
            self.status = FYERS_AUTH_ERROR
            self.last_error = str(e)
            return False
        finally:
            self._login_lock.release()

    def start_background_login(self):
        """Spawns a background daemon thread to run login_with_totp without blocking caller."""
        self.status = FYERS_CONNECTING
        t = threading.Thread(target=self.login_with_totp, kwargs={"force": True}, daemon=True)
        t.start()
        logger.info("[INFO] Started FYERS automatic TOTP authentication in background thread.")

    def ensure_authenticated(self) -> bool:
        """Ensures access token is valid; attempts refresh or automated TOTP login if expired."""
        if self.is_access_token_valid():
            return True

        if self.refresh_token:
            if self.refresh_access_token():
                return True

        if FYERS.is_headless_login_configured():
            return self.login_with_totp()

        return False

    def exchange_code_for_tokens(self, auth_code: str) -> str:
        """Manual OAuth fallback: exchanges auth_code for access_token and refresh_token."""
        FYERS.reload()
        if not FYERS.app_id or not FYERS.secret_key:
            raise ValueError("FYERS_APP_ID and FYERS_SECRET_KEY must be set in environment.")

        from fyers_apiv3 import fyersModel

        session = fyersModel.SessionModel(
            client_id=FYERS.app_id,
            secret_key=FYERS.secret_key,
            redirect_uri=FYERS.redirect_url,
            response_type="code",
            grant_type="authorization_code"
        )
        session.set_token(auth_code)
        response = session.generate_token()

        if isinstance(response, dict) and response.get("s") == "ok" and response.get("access_token"):
            access_token = response["access_token"]
            refresh_token = response.get("refresh_token", "")
            expires_in = response.get("expires_in", 86400)
            self.save_tokens(access_token, refresh_token, expires_in=expires_in)
            return access_token
        else:
            msg = response.get("message", str(response)) if isinstance(response, dict) else str(response)
            self.status = FYERS_AUTH_ERROR
            self.last_error = msg
            raise RuntimeError(f"FYERS token generation failed: {msg}")

    def reload_and_verify(self, auto_totp: bool = False) -> str:
        """Startup check: loads stored tokens, validates access token, or triggers TOTP login."""
        self.load_tokens()

        if self.is_access_token_valid():
            self.status = FYERS_AUTHENTICATED
            logger.info("[INFO] FYERS access token is valid and active.")
            return self.status

        # Access token missing or expired -> attempt refresh if refresh token present
        if self.refresh_token:
            if self.refresh_access_token():
                return self.status

        # If headless credentials configured and auto_totp requested
        if auto_totp and FYERS.is_headless_login_configured():
            self.start_background_login()
            return self.status

        self.status = FYERS_REAUTH_REQUIRED
        self.last_error = "Re-authentication required. Access token expired and no valid refresh token."
        logger.info("[INFO] FYERS authentication status: %s", self.status)
        return self.status

    def get_auth_status(self) -> Dict[str, Any]:
        """Returns safe user-friendly authentication status dict for backend API responses without leaking secrets/tokens."""
        if self.is_access_token_valid():
            self.status = FYERS_AUTHENTICATED
        elif self.status == FYERS_AUTHENTICATED:
            self.status = FYERS_TOKEN_EXPIRED

        return {
            "is_authenticated": (self.status == FYERS_AUTHENTICATED),
            "status": self.status,
            "headless_login_configured": FYERS.is_headless_login_configured(),
            "has_access_token": bool(self.access_token),
            "has_refresh_token": bool(self.refresh_token),
            "last_error": self.last_error if self.status != FYERS_AUTHENTICATED else ""
        }

    def get_safe_status(self) -> Dict[str, Any]:
        """Alias for get_auth_status."""
        return self.get_auth_status()


# Global Singleton Manager Instance
_token_manager_instance: FyersTokenManager | None = None


def get_token_manager() -> FyersTokenManager:
    global _token_manager_instance
    if _token_manager_instance is None:
        _token_manager_instance = FyersTokenManager()
    return _token_manager_instance
