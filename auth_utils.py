"""JWT helpers and authentication decorators for API routes."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import current_app, g, jsonify, request


def create_access_token(user_id: int) -> str:
    secret = current_app.config["JWT_SECRET_KEY"]
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, secret, algorithm="HS256")


def decode_access_token(token: str) -> dict | None:
    try:
        secret = current_app.config["JWT_SECRET_KEY"]
        return jwt.decode(token, secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None


def require_auth(f):
    """Require a valid Bearer JWT; sets ``g.current_user_id`` to the authenticated user."""

    @wraps(f)
    def wrapped(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"success": False, "error": "Authentication required."}), 401
        token = auth_header[7:].strip()
        payload = decode_access_token(token)
        if not payload or "sub" not in payload:
            return jsonify({"success": False, "error": "Invalid or expired token."}), 401
        raw_sub = payload["sub"]
        g.current_user_id = int(raw_sub) if not isinstance(raw_sub, int) else raw_sub
        return f(*args, **kwargs)

    return wrapped
