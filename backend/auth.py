from functools import wraps
from flask import g, jsonify, request
from supabase_client import get_supabase_client

def require_auth(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        token = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
        client = get_supabase_client()
        if client and token:
            try:
                g.user = client.auth.get_user(token).user
                return view(*args, **kwargs)
            except Exception:
                pass
        if client:
            return jsonify({"error": "Authentication required."}), 401
        g.user = None
        return view(*args, **kwargs)
    return wrapped