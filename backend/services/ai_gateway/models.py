from dataclasses import dataclass, field
from typing import Any, Iterator

@dataclass
class AIRequest:
    task: str
    prompt: str
    context: dict[str, Any] = field(default_factory=dict)
    user_id: str | None = None

@dataclass
class AIResponse:
    text: str
    provider: str
    model: str
    tokens: int = 0
    fallback: bool = False

@dataclass(frozen=True)
class ProviderStatus:
    name: str
    model: str
    available: bool
    capabilities: tuple[str, ...]
    speed: str
    context_window: str
