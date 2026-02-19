import os
from ml.parser import parse_file
from ml.chunker import recursive_chunker

if __name__ == "__main__":
    print("=== Testing Ingestion Pipeline (Parse -> Chunk) ===")
    
    # Put the path to the real PDF you used earlier
    test_file_path = "/home/manet/Downloads/RAG/test.md"
    
    if not os.path.exists(test_file_path):
        print(f"\nError: Could not find the file at '{test_file_path}'.")
        print("Please update 'test_file_path' with a real file on your computer.")
    else:
        try:
            # Parse the file
            print(f"\n1. Parsing '{test_file_path}'...")
            raw_text = parse_file(test_file_path)
            print(f"   -> Successfully extracted {len(raw_text)} characters.")
            
            # Chunk the text
            print("\n2. Chunking the extracted text...")
            chunks = recursive_chunker(raw_text, chunk_size=800, overlap=200)
            print(f"   -> Successfully created {len(chunks)} chunks.")
            
            # Display results
            print("\n=== FIRST 3 CHUNKS ===")
            for i in range(min(3, len(chunks))):
                print(f"\n[CHUNK {i + 1} | Length: {len(chunks[i])} chars]")
                print(chunks[i])
                print("-" * 50)
                
        except Exception as e:
            print(f"\nPipeline Error: {e}")