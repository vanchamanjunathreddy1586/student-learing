from ..models import AIRequest, AIResponse, ProviderStatus
from ..provider_base import AIProvider

class DemoProvider(AIProvider):
    status = ProviderStatus("Smart Learning demo", "guided-tutor", True, ("chat", "explain", "quiz", "planner"), "instant", "32k")

    def chat(self, request: AIRequest) -> AIResponse:
        topic = request.context.get("topic", "your topic")
        task = request.task.replace("_", " ")
        text = (f"Let's work on **{topic}**. I tailored this {task} response to your current learning path.\n\n"
                "Start with the core idea, then test yourself with one small example. "
                "When you are ready, ask me to explain it more deeply or turn it into flashcards.")
        return AIResponse(text, self.status.name, self.status.model, len(text.split()), True)

class OpenAIProvider(AIProvider):
    def __init__(self, api_key: str, model: str):
        from openai import OpenAI
        self.client = OpenAI(api_key=api_key)
        self.status = ProviderStatus("OpenAI", model, True, ("chat", "explain", "quiz", "planner", "vision"), "fast", "128k")

    def chat(self, request: AIRequest) -> AIResponse:
        response = self.client.chat.completions.create(model=self.status.model, messages=[
            {"role": "system", "content": "You are a concise, encouraging personal tutor. Use markdown."},
            {"role": "user", "content": request.prompt},
        ])
        text = response.choices[0].message.content or "I could not generate an answer."
        tokens = response.usage.total_tokens if response.usage else len(text.split())
        return AIResponse(text, self.status.name, self.status.model, tokens)
