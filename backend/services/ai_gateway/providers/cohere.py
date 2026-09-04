from .generic import GenericProvider

class CohereProvider(GenericProvider):
    def __init__(self, api_key: str, model: str = "command-r-plus"):
        super().__init__("Cohere", model, api_key, ("chat", "summary"))
