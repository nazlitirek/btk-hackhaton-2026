import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

api_key = os.environ.get("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

models_to_test = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.5-flash", "gemini-2.0-flash-lite"]

for model in models_to_test:
    try:
        print(f"Testing generate_content with {model}...")
        response = client.models.generate_content(
            model=model,
            contents="Merhaba, nasılsın?",
        )
        print(f"Success with {model}! Response: {response.text}")
        break
    except Exception as e:
        print(f"Error with {model}: {e}")
