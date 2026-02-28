# This is sparse search, which is a keyword-based search. It uses PostgreSQL's full-text search capabilities.

from typing import List, Dict, Optional
from db import search_keyword_chunks 

def search_keywords(query: str, user_id: str, top_k: int = 5, document_ids: Optional[List[str]] = None) -> List[Dict]:
    search_terms = " & ".join(query.strip().split())
    # Search the database using the keyword search
    return search_keyword_chunks(user_id, search_terms, top_k, document_ids=document_ids)