from dataclasses import dataclass
from datetime import datetime, timezone

@dataclass
class UsageTracker:
    request_count: int = 0
    token_count: int = 0
    error_count: int = 0

    def record(self, tokens: int = 0, error: bool = False) -> None:
        self.request_count += 1
        self.token_count += tokens
        self.error_count += int(error)

    def snapshot(self) -> dict:
        return {"request_count": self.request_count, "token_count": self.token_count,
                "error_count": self.error_count, "updated_at": datetime.now(timezone.utc).isoformat()}
