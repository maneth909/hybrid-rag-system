from typing import List, Optional

def recursive_chunker(
    text: str, 
    chunk_size: int = 800, 
    overlap: int = 200, 
    separators: Optional[List[str]] = None
) -> List[str]:

    if separators is None:
        separators = ["\n\n", "\n", ". ", " "]
        
    # if the text fits within the limit, return it as one chunk
    if len(text) <= chunk_size:
        return [text]
        
    # identify the largest structural separator present in the text
    current_separator = separators[-1] 
    next_separators = []
    
    for i, sep in enumerate(separators):
        if sep in text:
            current_separator = sep
            # the next recursive call should only use smaller separators
            next_separators = separators[i+1:]
            break
            
    # split the text using the chosen separator
    splits = text.split(current_separator)
    chunks = []
    current_group = ""
    
    # iterate through the splits to build chunks
    for split in splits:
        # if a single split is still larger than the target size, recurse on it
        if len(split) > chunk_size:
            if current_group:
                chunks.append(current_group)
                current_group = ""
            
            sub_chunks = recursive_chunker(split, chunk_size, overlap, next_separators)
            chunks.extend(sub_chunks)
            continue
            
        # If adding the next split exceeds the limit, push the current group and start a new one
        if len(current_group) + len(split) + len(current_separator) > chunk_size:
            chunks.append(current_group)
            
            # Overlap Logic: Carry over the end of the previous chunk
            overlap_text = current_group[-overlap:] if overlap > 0 else ""
            if " " in overlap_text and overlap > 0:
                overlap_text = overlap_text.split(" ", 1)[-1]
                
            current_group = overlap_text + current_separator + split
        else:
            if current_group:
                current_group += current_separator
            current_group += split
            
    if current_group:
        chunks.append(current_group)
        
    return chunks