# llmchat/factory.py
import os
from .groq_llm import GroqLLM
from .gemini_llm import GeminiLLM

def get_llm(provider=None, **kwargs):
    # Use LLM_PROVIDER environment variable if provider not specified
    if provider is None:
        provider = os.getenv("LLM_PROVIDER", "groq")
    
    provider = provider.lower()
    
    if provider == "groq":
        return GroqLLM(**kwargs)
    elif provider == "gemini":
        return GeminiLLM(**kwargs)
    else:
        raise ValueError(f"Unsupported LLM provider: {provider}")
