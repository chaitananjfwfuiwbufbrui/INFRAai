from services.llmchat.gemini_llm import GeminiLLM

llm = GeminiLLM()

result = llm.generate_json_from_image(
    image_path="test.jpeg",
    instruction="""
Analyze this cloud architecture diagram and output ONLY valid JSON.

Rules:
- JSON only
- nodes and edges
- Use AWS services if recognizable
- Short IDs
- No explanations
"""
)

print(result)
