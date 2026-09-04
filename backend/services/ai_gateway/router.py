from .models import AIRequest
from .provider_base import AIProvider

TASK_PREFERENCES = {
    "chat": ("OpenAI", "Smart Learning demo"),
    "explain": ("OpenAI", "Smart Learning demo"),
    "quiz": ("OpenAI", "Smart Learning demo"),
    "planner": ("OpenAI", "Smart Learning demo"),
    "summary": ("OpenAI", "Smart Learning demo"),
}

class ModelRouter:
    def __init__(self, providers: list[AIProvider]):
        self.providers = providers

    def route(self, request: AIRequest) -> list[AIProvider]:
        preferred = TASK_PREFERENCES.get(request.task, ("OpenAI", "Smart Learning demo"))
        ranked = sorted(self.providers, key=lambda provider: preferred.index(provider.status.name) if provider.status.name in preferred else len(preferred))
        return [provider for provider in ranked if provider.status.available]
