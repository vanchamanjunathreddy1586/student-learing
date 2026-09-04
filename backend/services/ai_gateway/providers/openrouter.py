from .generic import GenericProvider

class OpenRouterProvider(GenericProvider):
    def __init__(self, api_key: str, model: str = "openai/gpt-4o-mini"):
        super().__init__("OpenRouter", model, api_key, ("chat", "coding", "vision"))
