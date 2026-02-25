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
        self.model = "llama-3.1-8b-instant"

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
    
    def generate_chat_title(self, user_query: str) -> str:
        # Generates a short (3-5 word) title based on the first user message.
        
        system_prompt = "You are a concise summarizer. Create a title (max 5 words) for a chat that starts with this question. Do not use quotes."
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_query}
            ],
            temperature=0.5, # Slightly higher creativity for titles
            max_tokens=20
        )
        return response.choices[0].message.content.strip()