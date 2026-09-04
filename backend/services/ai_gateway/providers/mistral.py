from .generic import GenericProvider

class MistralProvider(GenericProvider):
    def __init__(self, api_key: str, model: str = "mistral-large-latest"):
        super().__init__("Mistral", model, api_key, ("chat", "summary", "quiz"))
