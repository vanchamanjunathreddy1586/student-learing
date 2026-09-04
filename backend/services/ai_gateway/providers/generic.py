from ..models import AIRequest, AIResponse, ProviderStatus
from ..provider_base import AIProvider

class GenericProvider(AIProvider):
    """Configuration-only adapter; concrete SDK integration can replace chat()."""
    def __init__(self, name: str, model: str, api_key: str, capabilities: tuple[str, ...] = ("chat",)):
        self.status = ProviderStatus(name, model, bool(api_key), capabilities, "fast", "32k")

    def chat(self, request: AIRequest) -> AIResponse:
        raise RuntimeError(f"{self.status.name} adapter is not configured")
