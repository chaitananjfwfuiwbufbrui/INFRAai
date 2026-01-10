# llmchat/base.py
from abc import ABC, abstractmethod

class BaseLLM(ABC):

    @abstractmethod
    def stream(self, messages):
        pass

    @abstractmethod
    def generate_json(self, messages):
        pass
