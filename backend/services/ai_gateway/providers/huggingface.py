from .generic import GenericProvider

class HuggingFaceProvider(GenericProvider):
    def __init__(self, api_key: str, model: str = "meta-llama/Llama-3.1-8B-Instruct"):
        super().__init__("Hugging Face", model, api_key, ("chat", "summary"))
