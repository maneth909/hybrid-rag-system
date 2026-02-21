import os
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware

from ml.parser import parse_file
from ml.chunker import recursive_chunker
from ml.embedder import generate_embeddings
from db import save_ingestion_data, get_all_documents, delete_document

app = FastAPI(title="Hybrid RAG API")

# Configure CORS so Next.js is allowed to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 # 10 MB strict limit

@app.post("/api/ingest")
async def ingest_file(
    file: UploadFile = File(...),
    user_id: str = Form(...) 
):
    # Missing file handling
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided.")
        
    # Unsuported file type handling
    ext = file.filename.split('.')[-1].lower()
    if ext not in ['pdf', 'txt', 'md']:
        raise HTTPException(status_code=400, detail="Unsupported file type. Only PDF, TXT, and MD are allowed.")
        
    # Empty or oversized file handling
    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail=f"File too large. Max size is {MAX_FILE_SIZE_BYTES / 1024 / 1024}MB.")
        
    # Save safely to a temporary file for the parser to read
    temp_file_path = f"temp_{file.filename}"
    try:
        with open(temp_file_path, "wb") as f:
            f.write(file_bytes)
            
        # --- THE INGESTION PIPELINE ---

        # Step A: Parse
        raw_text = parse_file(temp_file_path)
        if not raw_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract any text from the file.")
            
        # Step B: Chunk
        chunks = recursive_chunker(raw_text, chunk_size=800, overlap=200)
        
        # Step C: Embed
        try:
            embeddings = generate_embeddings(chunks)
        except Exception as e:
            # Error Handling: Ollama is down or missing the model
            raise HTTPException(status_code=503, detail=f"AI Service Error: {str(e)}")
            
        # Step D: Save to Database
        try:
            document_id = save_ingestion_data(
                user_id=user_id,
                filename=file.filename,
                file_type=ext,
                content=raw_text,
                chunks=chunks,
                embeddings=embeddings
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database Transaction Failed: {str(e)}")
            
        return {
            "message": "File successfully ingested.",
            "document_id": document_id,
            "chunks_created": len(chunks)
        }
        
    finally:
        # Cleanup the remporary file in all cases
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)


# API endpoint to list all documents for a user
@app.get("/api/documents")
async def list_documents(user_id: str):
    """Returns a list of all files uploaded by the user."""
    try:
        docs = get_all_documents(user_id)
        return {"documents": docs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")


# API endpoint to delete a document and its chunks
@app.delete("/api/documents/{document_id}")
async def remove_document(document_id: str, user_id: str):
    """Deletes a file and all its vector chunks from the database."""
    try:
        success = delete_document(document_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Document not found or you do not have permission to delete it.")
        
        return {"message": "Document and all associated chunks successfully deleted."}
    except HTTPException:
        raise  # Re-raise HTTP exceptions to be handled by FastAPI
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")