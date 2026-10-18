import os
from dotenv import load_dotenv
from google import genai

load_dotenv("ipa.env", override=True)

model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
key = os.getenv("GEMINI_API_KEY")

print("Model:", model)
print("Key loaded:", bool(key))

client = genai.Client(api_key=key)
response = client.models.generate_content(model=model, contents="Say hi in one word.")
print("Reply:", response.text)