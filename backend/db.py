import psycopg
from pgvector.psycopg import register_vector
from typing import List
from dotenv import load_dotenv
import os

load_dotenv()

DB_PARAMS = {
    "dbname": "hybrid_rag",
    "user": "manet",
    "host": "localhost",
    "port": 5432,
    "password": os.getenv("DB_PASSWORD")
}

def get_connection():
    # Creates a new database connection and registers the vector type.
    conn = psycopg.connect(**DB_PARAMS)
    register_vector(conn)
    return conn

def save_ingestion_data(
    user_id: str, 
    filename: str, 
    file_type: str, 
    content: str, 
    chunks: List[str], 
    embeddings: List[List[float]]
) -> str:
    # Performs a single transaction to save the document and all its chunks.
    with get_connection() as conn:
        with conn.cursor() as cur:
            try:
                # Insert the parent Document and grab its new UUID
                cur.execute(
                    """
                    INSERT INTO documents (user_id, filename, file_type, content, file_size_bytes)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id;
                    """,
                    (user_id, filename, file_type, content, len(content.encode('utf-8')))
                )
                
                document_id = cur.fetchone()[0]
                
                # Insert every Chunk linked to that Document UUID
                for i, (chunk_text, embedding) in enumerate(zip(chunks, embeddings)):
                    cur.execute(
                        """
                        INSERT INTO chunks (document_id, chunk_index, content, embedding)
                        VALUES (%s, %s, %s, %s);
                        """,
                        (document_id, i, chunk_text, embedding)
                    )
                
                # Only save to the database if ALL insertions worked
                conn.commit()
                return str(document_id)
                
            except Exception as e:
                # If anything fails, undo the whole operation
                conn.rollback()
                raise RuntimeError(f"Database transaction failed: {e}")
            

def get_all_documents(user_id: str) -> List[dict]:
    # Fetches all documents uploaded by a specific user.
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, filename, file_type, file_size_bytes, uploaded_at 
                FROM documents 
                WHERE user_id = %s 
                ORDER BY uploaded_at DESC;
                """,
                (user_id,)
            )
            rows = cur.fetchall()
            
            # Format the raw SQL rows into a clean list of dictionaries for FastAPI
            documents = []
            for row in rows:
                documents.append({
                    "id": str(row[0]),
                    "filename": row[1],
                    "file_type": row[2],
                    "file_size_bytes": row[3],
                    "uploaded_at": row[4].isoformat() if row[4] else None
                })
            return documents

def delete_document(document_id: str, user_id: str) -> bool:
    with get_connection() as conn:
        with conn.cursor() as cur:
            # Enforce user_id so users can't delete other people's files
            cur.execute(
                """
                DELETE FROM documents 
                WHERE id = %s AND user_id = %s 
                RETURNING id;
                """,
                (document_id, user_id)
            )
            deleted_id = cur.fetchone()
            conn.commit()
            
            # Returns True if a file was actually found and deleted
            return deleted_id is not None
        

def search_dense_chunks(user_id: str, query_vector: List[float], top_k: int = 5, threshold: float = 0.3) -> List[dict]:
    # Finds the most similar chunks to a query vector using Cosine Distance (<=>).
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(f"SET LOCAL hnsw.ef_search = {top_k * 10}")
            cur.execute(
                """
                SELECT
                    c.content,
                    d.filename,
                    1 - (c.embedding <=> %s::vector) as similarity
                FROM chunks c
                JOIN documents d ON c.document_id = d.id
                WHERE d.user_id = %s
                  AND 1 - (c.embedding <=> %s::vector) >= %s
                ORDER BY c.embedding <=> %s::vector
                LIMIT %s;
                """,
                (query_vector, user_id, query_vector, threshold, query_vector, top_k)
            )
            rows = cur.fetchall()
            
            results = []
            for row in rows:
                results.append({
                    "content": row[0],
                    "filename": row[1],
                    "similarity": round(row[2], 3)
                })
            return results


def search_keyword_chunks(user_id: str, search_terms: str, top_k: int = 5) -> List[dict]:
    # Performs full-text search using PostgreSQL's ts_rank_cd.
    if not search_terms:
        return []

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    c.content,
                    d.filename,
                    ts_rank_cd(to_tsvector('english', c.content), query) as score,
                    c.id as chunk_id
                FROM chunks c
                JOIN documents d ON c.document_id = d.id
                , to_tsquery('english', %s) query
                WHERE d.user_id = %s
                  AND to_tsvector('english', c.content) @@ query
                ORDER BY score DESC
                LIMIT %s;
            """, (search_terms, user_id, top_k))
            
            rows = cur.fetchall()
            
            # Format results
            results = []
            for row in rows:
                results.append({
                    "content": row[0],
                    "filename": row[1],
                    "score": float(row[2]), 
                    "chunk_id": str(row[3])
                })
                
            return results


# --- CONVERSATION MANAGEMENT ---
def create_conversation(user_id: str, title: str) -> str:
    # Creates a new conversation and returns its UUID.
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO conversations (user_id, title) VALUES (%s, %s) RETURNING id;",
                (user_id, title)
            )
            return str(cur.fetchone()[0])

def add_message(conversation_id: str, role: str, content: str):
    # Adds a message (user or assistant) to a conversation.
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO messages (conversation_id, role, content) VALUES (%s, %s, %s);",
                (conversation_id, role, content)
            )
            conn.commit()

def get_user_conversations(user_id: str) -> List[dict]:
    # Returns all conversations for a user, sorted by newest first.
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, title, created_at FROM conversations WHERE user_id = %s ORDER BY created_at DESC;",
                (user_id,)
            )
            rows = cur.fetchall()
            return [{"id": str(row[0]), "title": row[1], "created_at": row[2]} for row in rows]

def get_conversation_messages(conversation_id: str) -> List[dict]:
    # Returns full chat history for a specific conversation.
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT role, content FROM messages WHERE conversation_id = %s ORDER BY created_at ASC;",
                (conversation_id,)
            )
            rows = cur.fetchall()
            return [{"role": row[0], "content": row[1]} for row in rows]
        
def update_conversation_title(conversation_id: str, new_title: str):
    # Updates the title of a specific conversation.
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE conversations SET title = %s WHERE id = %s;",
                (new_title, conversation_id)
            )
            conn.commit()

def delete_conversation(conversation_id: str, user_id: str) -> bool:
    # Deletes a conversation and all its messages.
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM conversations WHERE id = %s AND user_id = %s RETURNING id;",
                (conversation_id, user_id)
            )
            deleted_id = cur.fetchone()
            conn.commit()
            return deleted_id is not None