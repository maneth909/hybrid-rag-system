from typing import List
from ml.embedder import generate_embeddings
from db import search_similar_chunks

def retrieve_context(query: str, user_id: str, top_k: int = 5) -> List[dict]:
    """
    1. Embeds the user query using the local Ollama model.
    2. Searches PostgreSQL for the most relevant chunks.
    """
    
    # generate_embeddings expects a list of strings, so we wrap the single query in brackets.
    # It returns a list of vectors, so we extract the first (and only) vector with [0].
    try:
        query_embeddings = generate_embeddings([query])
        if not query_embeddings:
            return []
            
        query_vector = query_embeddings[0]
    except Exception as e:
        raise RuntimeError(f"Failed to embed query: {e}")
        
    # Search the database using the new vector
    relevant_chunks = search_similar_chunks(
        user_id=user_id, 
        query_vector=query_vector, 
        top_k=top_k
    )
    
    return relevant_chunks