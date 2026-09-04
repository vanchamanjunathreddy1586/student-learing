from .models import AIRequest, AIResponse
from .providers.core import DemoProvider

def safe_response(request: AIRequest, error: Exception | None = None) -> AIResponse:
    return DemoProvider().chat(request)