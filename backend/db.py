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
    """Fetches all documents uploaded by a specific user."""
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
    """
    Deletes a document. 
    Thanks to ON DELETE CASCADE, this will also wipe out all associated chunks.
    """
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