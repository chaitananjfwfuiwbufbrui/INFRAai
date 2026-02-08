import json
import os
from google import genai
from google.genai import types
from dotenv import load_dotenv
from .base import BaseLLM

load_dotenv()


class GeminiLLM(BaseLLM):
    def __init__(
        self,
        model="gemini-3-flash-preview",
        temperature=0.2,
        max_tokens=4096,
    ):
        self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens

    # ---------------- TEXT JSON ----------------
    def generate_json(self, messages, retries=2):
        last_error = None

        for attempt in range(retries + 1):
            response = self.client.models.generate_content(
                model=self.model,
                contents=self._convert_messages(messages),
                config={
                    "temperature": self.temperature,
                    "max_output_tokens": self.max_tokens,
                    "response_mime_type": "application/json",
                }
            )

            raw_text = self._extract_text(response)

            try:
                return self._safe_json_parse(raw_text)
            except Exception as e:
                last_error = e

                messages.append({
                    "role": "system",
                    "content": (
                        "Your previous response was INVALID JSON. "
                        "Return ONLY corrected JSON. "
                        "NO comments, NO explanations, NO extra text."
                    )
                })

        raise RuntimeError(f"LLM failed to return valid JSON: {last_error}")


    # ---------------- IMAGE → SERVICES ----------------
    def detect_services_from_image(self, image_path, instruction):
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
                "temperature": 0,
                "max_output_tokens": 512,  # 🔥 SMALL ON PURPOSE
                "response_mime_type": "application/json",
            }
        )

        # Even if truncated, try parsing
        raw_text = self._extract_text(response)
        return self._safe_json_parse(raw_text)

    # ---------------- HELPERS ----------------
    def _convert_messages(self, messages):
        return "\n\n".join(
            f"{m['role'].upper()}:\n{m['content']}" for m in messages
        )

    def _extract_text(self, response):
        if hasattr(response, "text") and response.text:
            return response.text

        parts = response.candidates[0].content.parts
        return "".join(p.text for p in parts if hasattr(p, "text"))

    def _safe_json_parse(self, text):
        text = text.strip()

        # Remove obvious non-JSON comment lines
        lines = []
        for line in text.splitlines():
            if line.strip().startswith(("//", "--")):
                continue
            lines.append(line)

        cleaned = "\n".join(lines)

        start = cleaned.find("{")
        end = cleaned.rfind("}")

        if start == -1 or end == -1 or end <= start:
            raise ValueError(f"No valid JSON found:\n{cleaned}")

        candidate = cleaned[start:end + 1]

        # Remove trailing commas
        candidate = candidate.replace(",}", "}").replace(",]", "]")

        try:
            return json.loads(candidate)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON after cleanup:\n{candidate}") from e

    def stream(self, messages):
        raise NotImplementedError("Streaming not supported for Gemini yet")