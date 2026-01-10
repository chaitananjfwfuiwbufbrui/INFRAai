# llmchat/groq_llm.py
from groq import Groq
from dotenv import load_dotenv
import json
from .base import BaseLLM

load_dotenv()

class GroqLLM(BaseLLM):
    def __init__(
        self,
        model="llama-3.3-70b-versatile",
        temperature=0.2,
        max_tokens=1024
    ):
        self.client = Groq()
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens

    def stream(self, messages):
        completion = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=self.temperature,
            max_completion_tokens=self.max_tokens,
            stream=True
        )

        for chunk in completion:
            yield chunk.choices[0].delta.content or ""

    def generate_json(self, messages):
        completion = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=self.temperature,
            max_completion_tokens=self.max_tokens,
            response_format={"type": "json_object"}
        )

        return json.loads(completion.choices[0].message.content)
