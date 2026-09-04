from .generic import GenericProvider

class XAIProvider(GenericProvider):
    def __init__(self, api_key: str, model: str = "grok-3-mini"):
        super().__init__("xAI Grok", model, api_key, ("chat", "research"))
