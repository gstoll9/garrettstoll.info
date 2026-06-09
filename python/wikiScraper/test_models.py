import os
from google import genai
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
for m in client.models.list():
    print(m.name)
