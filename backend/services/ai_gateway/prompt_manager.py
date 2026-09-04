class PromptManager:
    def build(self, task: str, prompt: str, memory: list[str] | None = None) -> str:
        context = "\n".join(memory or [])
        return f"Task: {task}\nLearner context:\n{context}\n\nRequest:\n{prompt}"[:12000]