from flask import request

MAX_BODY_BYTES = 2 * 1024 * 1024

def validate_request_size():
    if request.content_length and request.content_length > MAX_BODY_BYTES:
        return {"error": "Request is too large."}, 413
    return None