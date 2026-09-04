from .generic import GenericProvider

class TogetherProvider(GenericProvider):
    def __init__(self, api_key: str, model: str = "meta-llama/Llama-3.3-70B-Instruct-Turbo"):
        super().__init__("Together AI", model, api_key, ("chat", "quiz"))
