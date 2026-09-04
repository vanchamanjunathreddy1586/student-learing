from .generic import GenericProvider

class AnthropicProvider(GenericProvider):
    def __init__(self, api_key: str, model: str = "claude-3-5-sonnet"):
        super().__init__("Anthropic Claude", model, api_key, ("chat", "explain", "summary"))
