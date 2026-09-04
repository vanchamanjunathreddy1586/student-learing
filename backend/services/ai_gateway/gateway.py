from collections import Counter
from .models import AIRequest, AIResponse, ProviderStatus
from .router import ModelRouter
from .providers import DemoProvider, OpenAIProvider
from .fallback import safe_response

class AIGateway:
    def __init__(self, config):
        providers = [DemoProvider()]
        if config.openai_api_key:
            try:
                providers.insert(0, OpenAIProvider(config.openai_api_key, config.openai_model))
            except Exception:
                pass
        self.providers = providers
        self.router = ModelRouter(providers)
        self.usage = Counter()

    def statuses(self) -> list[ProviderStatus]:
        return [provider.status for provider in self.providers]

    def complete(self, request: AIRequest) -> AIResponse:
        last_error = None
        for provider in self.router.route(request):
            try:
                response = provider.chat(request)
                self.usage[provider.status.name] += response.tokens
                return response
            except Exception as error:
                last_error = error
        return safe_response(request, last_error)

    def stream(self, request: AIRequest):
        response = self.complete(request)
        for word in response.text.split():
            yield word + " "
