import os
import re
from pypdf import PdfReader 

def clean_extracted_text(raw_text: str) -> str:
    if not raw_text:
        return ""
        
    # replace weird unicode spaces
    text = raw_text.replace('\xa0', ' ')
    
    # preserve deliberate paragraph breaks (double newlines)
    text = re.sub(r'\n{2,}', '||PARAGRAPH||', text)
    
    # fix the broken sentence problem (single newlines)
    text = text.replace('\n', ' ')
    
    # multiple spaces into a single space
    text = re.sub(r' +', ' ', text)
    
    # restore the paragraph breaks
    text = text.replace('||PARAGRAPH||', '\n\n')
    
    return text.strip()

def parse_pdf(file_path: str) -> str:
    """Extracts text from a PDF file using pypdf."""
    try:
        reader = PdfReader(file_path) 
        raw_text = ""
        # iterate through every page and append the text
        for page in reader.pages:
            extracted = page.extract_text() #
            if extracted:
                raw_text += extracted + "\n\n"
        return clean_extracted_text(raw_text)
    except Exception as e:
        raise ValueError(f"Failed to parse PDF: {str(e)}")

def parse_txt(file_path: str) -> str:
    """Reads a standard text file."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return clean_extracted_text(f.read())
    except Exception as e:
        raise ValueError(f"Failed to parse TXT: {str(e)}")

def parse_md(file_path: str) -> str:
    """Reads a Markdown file."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            # skip the heavy cleaning for Markdown because 
            return f.read().strip()
    except Exception as e:
        raise ValueError(f"Failed to parse MD: {str(e)}")

def parse_file(file_path: str) -> str:
    """
    The master router. Takes a file path, checks the extension, 
    and passes it to the correct extraction function.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
        
    # extract the extension (e.g., 'pdf', 'txt')
    ext = file_path.lower().split('.')[-1]
    
    if ext == 'pdf':
        return parse_pdf(file_path)
    elif ext == 'txt':
        return parse_txt(file_path)
    elif ext in ['md', 'markdown']:
        return parse_md(file_path)
    else:
        raise ValueError(f"Unsupported file extension: .{ext}. Only PDF, TXT, and MD are supported.")


# if __name__ == "__main__":
#     print("=== Testing Parser Routing ===")
    
#     test_file_path = "/home/manet/Downloads/RAG/test.pdf" 
    
#     try:
#         result = parse_file(test_file_path)
#         print("Success! Extracted Text:\n")
#         print(result)
#     except Exception as e:
#         print(f"Error during testing: {e}")