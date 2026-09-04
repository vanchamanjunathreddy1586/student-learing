from abc import ABC, abstractmethod
from typing import Iterator
from .models import AIRequest, AIResponse, ProviderStatus

class AIProvider(ABC):
    status: ProviderStatus

    @abstractmethod
    def chat(self, request: AIRequest) -> AIResponse:
        raise NotImplementedError

    def stream_chat(self, request: AIRequest) -> Iterator[str]:
        response = self.chat(request)
        yield from response.text.split()
