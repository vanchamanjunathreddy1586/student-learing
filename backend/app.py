from pathlib import Path
from flask import Flask, Response, g, jsonify, request, send_from_directory
from flask_cors import CORS
from config import Config
from services.ai_gateway import AIGateway
from services.ai_gateway.models import AIRequest
from services.ai_gateway.streaming import sse_chunks
from middleware import validate_request_size
from auth import require_auth

ROOT = Path(__file__).resolve().parent.parent
app = Flask(__name__, static_folder=str(ROOT / "frontend"), static_url_path="")
config = Config()
app.config["SECRET_KEY"] = config.secret_key
CORS(app, origins=[origin.strip() for origin in config.cors_origins.split(",")])
gateway = AIGateway(config)
app.before_request(validate_request_size)

@app.get("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "mode": "supabase" if config.supabase_configured else "local-demo"})

@app.get("/api/config")
def public_config():
    return jsonify({
        "supabaseUrl": config.supabase_url,
        "supabaseAnonKey": config.supabase_anon_key,
    })

@app.get("/api/auth/me")
@require_auth
def current_user():
    user = g.user
    return jsonify({"user": {"id": user.id, "email": user.email} if user else None})

@app.get("/api/ai/providers")
def providers():
    return jsonify({"providers": [status.__dict__ for status in gateway.statuses()], "active": gateway.statuses()[0].name})

@app.get("/api/analytics/summary")
def analytics():
    return jsonify({"weekly_minutes": [35, 48, 42, 61, 55, 72, 48], "mastery": 68, "streak": 7, "sessions": 12, "usage": gateway.usage})

@app.post("/api/ai/chat")
def chat():
    payload = request.get_json(silent=True) or {}
    prompt = str(payload.get("prompt", "")).strip()
    if not prompt or len(prompt) > 6000:
        return jsonify({"error": "A prompt between 1 and 6000 characters is required."}), 400
    response = gateway.complete(AIRequest(task=str(payload.get("task", "chat")), prompt=prompt,
                                          context=payload.get("context", {}), user_id=payload.get("user_id")))
    return jsonify(response.__dict__)

@app.post("/api/ai/chat/stream")
def chat_stream():
    payload = request.get_json(silent=True) or {}
    prompt = str(payload.get("prompt", "")).strip()
    if not prompt or len(prompt) > 6000:
        return jsonify({"error": "A prompt between 1 and 6000 characters is required."}), 400
    stream = gateway.stream(AIRequest(task=str(payload.get("task", "chat")), prompt=prompt,
                                      context=payload.get("context", {})))
    return Response(sse_chunks(stream), mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

@app.post("/api/ai/quiz")
def quiz():
    payload = request.get_json(silent=True) or {}
    topic = str(payload.get("topic", "General review"))[:120]
    response = gateway.complete(AIRequest(task="quiz", prompt=f"Create a short quiz about {topic}.", context={"topic": topic}))
    return jsonify({"topic": topic, "questions": [{"question": f"What is the central idea of {topic}?", "options": ["A core principle", "A date", "A tool", "A formula"], "answer": 0}], "generated_by": response.provider})

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
