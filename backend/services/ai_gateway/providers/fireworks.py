from .generic import GenericProvider

class FireworksProvider(GenericProvider):
    def __init__(self, api_key: str, model: str = "accounts/fireworks/models/llama-v3p1-70b-instruct"):
        super().__init__("Fireworks AI", model, api_key, ("chat", "quiz"))
