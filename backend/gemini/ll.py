import os
from dotenv import load_dotenv
from google import genai

load_dotenv()  # loads .env

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

response = client.models.generate_content(
    model="gemini-2.0-flash",
    contents="How does AI work?"
)

print(response.text)
