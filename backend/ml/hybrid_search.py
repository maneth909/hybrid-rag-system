# Combines Dense (Vector) and Sparse (Keyword) search results using Reciprocal Rank Fusion (RRF).

from typing import List, Dict
from ml.dense_search import dense_search
from ml.keyword_search import search_keywords

def hybrid_search(query: str, user_id: str, top_k: int = 5) -> List[Dict]:
    dense_results = dense_search(query, user_id, top_k=top_k * 2)
    keyword_results = search_keywords(query, user_id, top_k=top_k * 2)
    
    # RRF Algorithm (Reciprocal Rank Fusion)
    k = 60
    chunk_scores = {}  # Map: chunk_id -> final_score
    chunk_data = {}    # Map: chunk_id -> {content, filename, etc.}

    # Process Dense Results
    for rank, doc in enumerate(dense_results):
        chunk_id = doc['filename'] + doc['content'][:20] 
        unique_key = doc['content'] 
        
        chunk_data[unique_key] = doc
        chunk_scores[unique_key] = chunk_scores.get(unique_key, 0) + (1 / (rank + k))

    # Process Keyword Results
    for rank, doc in enumerate(keyword_results):
        unique_key = doc['content']
        
        if unique_key not in chunk_data:
            chunk_data[unique_key] = doc
            
        chunk_scores[unique_key] = chunk_scores.get(unique_key, 0) + (1 / (rank + k))

    # Sort by Final RRF Score
    sorted_chunks = sorted(
        chunk_scores.items(), 
        key=lambda item: item[1], 
        reverse=True
    )

    # Return top_k results
    final_results = []
    for content, score in sorted_chunks[:top_k]:
        doc = chunk_data[content]
        # Allow the UI to see the new hybrid score
        doc['score'] = round(score, 4) 
        final_results.append(doc)
        
    return final_results