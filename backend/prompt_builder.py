from typing import List

def build_rag_prompt(query: str, chunks: List[dict]) -> str:
    system_msg = """You are a highly precise assistant. Answer the user's question using ONLY the provided context.

Rules:
1. Answer ONLY from the context below.
2. If the context does not contain the answer, say exactly: "I don't have enough information to answer that." Do not guess or use outside knowledge.
3. Cite the source file you used in your answer (e.g., "According to example_report.pdf...").
4. Be concise and precise."""

    # Format the chunks into a readable text block
    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        context_parts.append(f"--- Context {i} [from {chunk['filename']}] ---\n{chunk['content']}\n")
    
    context_section = "\n".join(context_parts)

    # Assemble the final prompt
    prompt = f"""{system_msg}

## Context Information
{context_section}

## User Question
{query}

## Answer
"""
    return prompt