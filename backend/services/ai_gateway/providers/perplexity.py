from .generic import GenericProvider

class PerplexityProvider(GenericProvider):
    def __init__(self, api_key: str, model: str = "sonar"):
        super().__init__("Perplexity", model, api_key, ("chat", "research", "summary"))
