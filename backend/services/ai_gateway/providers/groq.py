from .generic import GenericProvider

class GroqProvider(GenericProvider):
    def __init__(self, api_key: str, model: str = "llama-3.3-70b-versatile"):
        super().__init__("Groq", model, api_key, ("chat", "quiz", "voice"))
