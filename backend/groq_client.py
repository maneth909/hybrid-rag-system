import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

class GroqClient:
    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY environment variable is missing from .env")
            
        self.client = Groq(api_key=api_key)
        self.model = "llama3-8b-8192"

    def generate(self, prompt: str) -> str:
        # Generates a complete answer all at once.
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,  # Low temperature prevents hallucination
            max_tokens=500,
        )
        return response.choices[0].message.content

    def generate_stream(self, prompt: str):
        stream = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=500,
            stream=True
        )

        for chunk in stream:
            # Yield each piece of text as it arrives from the Groq servers
            if chunk.choices[0].delta.content is not None:
                yield chunk.choices[0].delta.content