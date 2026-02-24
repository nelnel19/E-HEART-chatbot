# response_handler.py
import re

def should_continue_response(response_text):
    """
    Check if the response seems truncated and should continue
    """
    if not response_text:
        return False
    
    # Check for incomplete sentences
    last_char = response_text.strip()[-1] if response_text.strip() else ''
    incomplete_ends = [',', 'and', 'but', 'or', 'because', 'if', 'when']
    
    # Check if ends with punctuation that suggests more content
    if last_char not in ['.', '!', '?', '"', "'"]:
        # Check last few words for incomplete indicators
        last_words = response_text.strip().split()[-3:] if len(response_text.split()) > 3 else []
        if any(word.lower() in incomplete_ends for word in last_words):
            return True
    
    return False

def split_long_response(response_text, max_length=1000):
    """
    Split long responses into chunks for better display
    """
    if len(response_text) <= max_length:
        return [response_text]
    
    # Split by sentences
    sentences = re.split(r'(?<=[.!?])\s+', response_text)
    chunks = []
    current_chunk = ""
    
    for sentence in sentences:
        if len(current_chunk) + len(sentence) <= max_length:
            current_chunk += sentence + " "
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = sentence + " "
    
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    return chunks