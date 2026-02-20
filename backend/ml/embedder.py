import json
import urllib.request
from typing import List

def generate_embeddings(chunks: List[str], model: str = "nomic-embed-text:latest") -> List[List[float]]:
    if not chunks:
        return []
    
    url = "http://localhost:11434/api/embed"

    # Pass the list of chunks and the model name to the embedding API
    payload = {
        "model": model,
        "input": chunks
    }

    headers = {
        "Content-Type": "application/json"
    }

    req = urllib.request.Request(
        url, 
        data=json.dumps(payload).encode('utf-8'), 
        headers=headers,
        method='POST'
    )

    try:
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                result = json.loads(response.read().decode('utf-8'))
                return result.get("embeddings", [])
            else:
                raise ValueError(f"Embedding API returned status code {response.status}")
    except Exception as e:
        raise ValueError(f"Failed to generate embeddings: {str(e)}")