from .generic import GenericProvider

class GeminiProvider(GenericProvider):
    def __init__(self, api_key: str, model: str = "gemini-2.0-flash"):
        super().__init__("Google Gemini", model, api_key, ("chat", "explain", "vision", "quiz"))
