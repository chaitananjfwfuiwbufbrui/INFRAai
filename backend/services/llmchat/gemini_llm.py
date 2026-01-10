# services/llmchat/gemini_llm.py

import json
import os
from google import genai
from dotenv import load_dotenv
from .base import BaseLLM
from google.genai import types
load_dotenv()


class GeminiLLM(BaseLLM):
    def __init__(
        self,
        model="gemini-3-flash-preview",
        temperature=0.2,
        max_tokens=4096,  # increased for structured outputs
        max_retries=2
    ):
        self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.max_retries = max_retries

    # --------------------------------------------------
    # Prompt conversion
    # --------------------------------------------------
    def _convert_messages(self, messages):
        prompt = ""
        for m in messages:
            prompt += f"{m['role'].upper()}:\n{m['content']}\n\n"
        return prompt.strip()

    # --------------------------------------------------
    # Streaming support
    # --------------------------------------------------
    def stream(self, messages):
        prompt = self._convert_messages(messages)

        stream = self.client.models.generate_content_stream(
            model=self.model,
            contents=prompt
        )

        for chunk in stream:
            if hasattr(chunk, "text") and chunk.text:
                yield chunk.text

    # --------------------------------------------------
    # JSON generation (SAFE)
    # --------------------------------------------------
    def generate_json(self, messages):
        last_error = None

        for attempt in range(1, self.max_retries + 1):
            response = self.client.models.generate_content(
                model=self.model,
                contents=self._convert_messages(messages),
                config={
                    "temperature": self.temperature,
                    "max_output_tokens": self.max_tokens,
                    "response_mime_type": "application/json",
                }
            )

            # 🔴 Detect truncation
            finish_reason = response.candidates[0].finish_reason.name
            if finish_reason == "MAX_TOKENS":
                last_error = RuntimeError(
                    "Gemini output truncated (MAX_TOKENS). Retrying with constrained output."
                )

                # Force smaller output on retry
                messages.append({
                    "role": "system",
                    "content": (
                        "IMPORTANT: Output minimal valid JSON only. "
                        "No explanations. No markdown. Reduce size."
                    )
                })
                continue

            # Extract text safely
            raw_text = self._extract_text(response)

            try:
                return self._safe_json_parse(raw_text)
            except Exception as e:
                last_error = e

        raise RuntimeError(
            f"Gemini failed to return valid JSON after {self.max_retries} attempts.\n"
            f"Last error: {last_error}"
        )

    # --------------------------------------------------
    # Gemini response text extraction
    # --------------------------------------------------
    def _extract_text(self, response):
        # Case 1: response.text exists
        if hasattr(response, "text") and response.text:
            return response.text

        # Case 2: candidates → content → parts
        try:
            parts = response.candidates[0].content.parts
            text = "".join(
                part.text for part in parts if hasattr(part, "text")
            )
            if text:
                return text
        except Exception:
            pass

        # Total failure
        raise ValueError(f"Gemini returned no usable text:\n{response}")

    # --------------------------------------------------
    # Bulletproof JSON parsing
    # --------------------------------------------------
    def _safe_json_parse(self, text):
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            start = text.find("{")
            end = text.rfind("}")

            if start == -1 or end == -1 or end <= start:
                raise ValueError(f"Invalid JSON from Gemini:\n{text}")

            return json.loads(text[start:end + 1])
    def generate_json_from_image(self, image_path, instruction):
        with open(image_path, "rb") as f:
            image_bytes = f.read()

        response = self.client.models.generate_content(
            model=self.model,
            contents=[
                types.Part.from_bytes(
                    data=image_bytes,
                    mime_type="image/png"
                ),
                instruction
            ],
            config={
                "temperature": self.temperature,
                "max_output_tokens": self.max_tokens,
                "response_mime_type": "application/json",
            }
        )

        # Detect truncation
        if response.candidates[0].finish_reason.name == "MAX_TOKENS":
            raise RuntimeError("Output truncated. Reduce JSON size.")

        raw_text = self._extract_text(response)
        return self._safe_json_parse(raw_text)