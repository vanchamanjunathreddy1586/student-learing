from .generic import GenericProvider

class OllamaProvider(GenericProvider):
    def __init__(self, base_url: str, model: str = "llama3.2"):
        super().__init__("Ollama", model, base_url, ("chat", "coding", "explain"))
