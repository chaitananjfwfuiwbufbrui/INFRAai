# llmchat/factory.py
from .groq_llm import GroqLLM
from .gemini_llm import GeminiLLM

def get_llm(provider="groq", **kwargs):
    if provider == "groq":
        return GroqLLM(**kwargs)
    elif provider == "gemini":
        return GeminiLLM(**kwargs)
    else:
        raise ValueError(f"Unsupported LLM provider: {provider}")
