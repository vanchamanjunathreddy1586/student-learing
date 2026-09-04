from .generic import GenericProvider

class DeepSeekProvider(GenericProvider):
    def __init__(self, api_key: str, model: str = "deepseek-chat"):
        super().__init__("DeepSeek", model, api_key, ("chat", "coding", "explain"))
