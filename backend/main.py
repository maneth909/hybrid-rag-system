import os
from ml.parser import parse_file
from ml.chunker import recursive_chunker
from ml.embedder import generate_embeddings

if __name__ == "__main__":
    test_file_path = "/home/manet/Downloads/RAG/test.md"
    
    try:
        raw_text = parse_file(test_file_path)
        chunks = recursive_chunker(raw_text, chunk_size=800, overlap=200)
        
        print(f"Generating embeddings for {len(chunks)} chunks...")
        
        # Pass the entire list of chunks to the embedder
        embeddings = generate_embeddings(chunks)
        
        print("\n=== EMBEDDING RESULTS ===")
        print(f"Total vectors generated: {len(embeddings)}")
        print(f"Dimensions per vector:   {len(embeddings[0])}")
        
        # Show a tiny snippet of the first vector to prove it's just math
        first_vector = embeddings[0]
        snippet = ", ".join([f"{num:.4f}" for num in first_vector[:5]])
        print(f"First vector snippet:    [{snippet}, ...]")
                
    except Exception as e:
        print(f"\nPipeline Error: {e}")