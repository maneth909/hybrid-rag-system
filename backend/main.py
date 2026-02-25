import os
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
import json
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from ml.parser import parse_file
from ml.chunker import recursive_chunker
from ml.embedder import generate_embeddings
from db import save_ingestion_data, get_all_documents, delete_document, create_conversation, add_message, get_user_conversations, get_conversation_messages, update_conversation_title, delete_conversation

# RAG
from ml.similarity import retrieve_context
from prompt_builder import build_rag_prompt
from groq_client import GroqClient

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

class QueryRequest(BaseModel):
    query: str
    user_id: str
    conversation_id: Optional[str] = None
    top_k: int = 5

class QueryResponse(BaseModel):
    answer: str
    sources: list[dict]
    chunks_found: int

class UpdateConversationRequest(BaseModel):
    title: str

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
    # Returns a list of all files uploaded by the user.
    try:
        docs = get_all_documents(user_id)
        return {"documents": docs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")


# API endpoint to delete a document and its chunks
@app.delete("/api/documents/{document_id}")
async def remove_document(document_id: str, user_id: str):
    # Deletes a file and all its vector chunks from the database.
    try:
        success = delete_document(document_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Document not found or you do not have permission to delete it.")
        
        return {"message": "Document and all associated chunks successfully deleted."}
    except HTTPException:
        raise  # Re-raise HTTP exceptions to be handled by FastAPI
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")
    

    
# --- RAG QUERY ENDPOINTS ---
@app.post("/api/query", response_model=QueryResponse)
async def query_documents(request: QueryRequest):
    # Standard query endpoint that waits for the full answer before responding.
    try:
        # 1. Retrieve relevant chunks
        chunks = retrieve_context(request.query, request.user_id, request.top_k)

        # 2. Format sources for the response
        sources = [
            {
                "filename": chunk["filename"],
                "content_preview": chunk["content"][:200] + "...",
                "similarity": chunk["similarity"]
            }
            for chunk in chunks
        ]

        # Handle empty results
        if not chunks:
            return QueryResponse(
                answer="I couldn't find any relevant information in your documents.",
                sources=[],
                chunks_found=0
            )

        # 3. Build prompt and generate answer
        prompt = build_rag_prompt(request.query, chunks)
        groq = GroqClient()
        answer = groq.generate(prompt)

        return QueryResponse(answer=answer, sources=sources, chunks_found=len(chunks))

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


@app.post("/api/query/stream")
async def query_documents_stream(request: QueryRequest):
    # 1. Handle Conversation ID (Create new if not provided)
    conversation_id = request.conversation_id
    new_title = None

    if not conversation_id:
        # Generate a smart title using the LLM
        groq = GroqClient()
        new_title = groq.generate_chat_title(request.query)
        conversation_id = create_conversation(request.user_id, new_title)

    # 2. Save User Message immediately
    add_message(conversation_id, "user", request.query)

    async def generate():
        try:
            # Send the conversation ID (and title if new) to the frontend first
            meta_payload = json.dumps({
                "type": "meta", 
                "conversation_id": conversation_id, 
                "title": new_title
            })
            yield f"data: {meta_payload}\n\n"

            # 1. Retrieve chunks
            chunks = retrieve_context(request.query, request.user_id, request.top_k)

            sources = [
                {
                    "filename": chunk["filename"],
                    "content_preview": chunk["content"][:200] + "...",
                    "similarity": chunk["similarity"]
                }
                for chunk in chunks
            ]
            sources_payload = json.dumps({"type": "sources", "data": sources})
            yield f"data: {sources_payload}\n\n"

            if not chunks:
                 pass 

            # 2. Build Prompt & Generate
            prompt = build_rag_prompt(request.query, chunks)
            groq = GroqClient()
            
            full_answer = "" 

            for token in groq.generate_stream(prompt):
                full_answer += token
                token_payload = json.dumps({"type": "token", "data": token})
                yield f"data: {token_payload}\n\n"
            
            # 3. Save Assistant Response to DB
            add_message(conversation_id, "assistant", full_answer)

            # 4. Signal Done
            final_payload = json.dumps({"type": "done"})
            yield f"data: {final_payload}\n\n"

        except Exception as e:
            error_payload = json.dumps({"type": "error", "data": str(e)})
            yield f"data: {error_payload}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")

@app.get("/api/conversations")
async def list_user_conversations(user_id: str):
    # Returns a list of all conversations for the sidebar.
    try:
        conversations = get_user_conversations(user_id)
        return {"conversations": conversations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    # Returns the message history for a specific chat.
    try:
        messages = get_conversation_messages(conversation_id)
        return {"messages": messages}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.put("/api/conversations/{conversation_id}")
async def update_conversation_endpoint(conversation_id: str, request: UpdateConversationRequest):
    # Renames a conversation.
    try:
        update_conversation_title(conversation_id, request.title)
        return {"status": "success", "id": conversation_id, "title": request.title}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/conversations/{conversation_id}")
async def delete_conversation_endpoint(conversation_id: str, user_id: str):
    # Deletes a conversation.
    try:
        success = delete_conversation(conversation_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Conversation not found or access denied")
        return {"status": "success", "id": conversation_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))