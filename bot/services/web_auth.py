"""Generate signed tokens for web admin login."""

import hmac
import hashlib
import json
import time
import base64
import os


def generate_admin_token(telegram_id: int, shop_id: str, shop_slug: str) -> str:
    """Generate a short-lived HMAC-SHA256 signed token for web login.

    Token format: base64url(payload).hex(signature)
    Payload: {tid, sid, slug, exp, iat}
    Secret: BOT_TOKEN (same as web side uses via jose)
    """
    secret = os.environ.get("BOT_TOKEN", "")
    ttl = 7 * 24 * 3600  # 7 days (one-time use, converted to session on click)

    payload = {
        "tid": telegram_id,
        "sid": shop_id,
        "slug": shop_slug,
        "purpose": "login",
        "iat": int(time.time()),
        "exp": int(time.time()) + ttl,
    }

    # We need to produce a token that jose on the web side can verify.
    # jose expects a proper JWT (header.payload.signature).
    # Let's produce a standard HS256 JWT.

    header = {"alg": "HS256", "typ": "JWT"}
    header_b64 = _b64url(json.dumps(header, separators=(",", ":")))
    payload_b64 = _b64url(json.dumps(payload, separators=(",", ":")))

    signing_input = f"{header_b64}.{payload_b64}"
    sig = hmac.new(
        secret.encode("utf-8"),
        signing_input.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    sig_b64 = _b64url_bytes(sig)

    return f"{header_b64}.{payload_b64}.{sig_b64}"


def _b64url(data: str) -> str:
    """Base64url encode a string (no padding)."""
    return base64.urlsafe_b64encode(data.encode("utf-8")).rstrip(b"=").decode("ascii")


def _b64url_bytes(data: bytes) -> str:
    """Base64url encode bytes (no padding)."""
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")
