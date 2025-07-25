
import tiktoken


def count_tokens(text: str) -> int:
    """
    Count tokens using tiktoken library (Claude uses similar tokenization to GPT models)

    This mirrors the TypeScript countTokens function from lib/llm/utils.ts
    """
    try:
        # Use GPT-4 encoding as it's closest to Claude's tokenization
        enc = tiktoken.encoding_for_model("gpt-4")
        tokens = enc.encode(text)
        return len(tokens)
    except Exception as e:
        print(f"Error counting tokens with tiktoken: {e}")
        # Fallback to approximately 4 characters per token (standard approximation)
        return len(text) // 4

def format_token_count(count: int) -> str:
    """
    Format a token count for display

    This mirrors the TypeScript formatTokenCount function from lib/llm/utils.ts
    """
    if count < 1000:
        return str(count)
    return f"{count / 1000:.1f}k"

def estimate_tokens_from_messages(messages: list) -> int:
    """
    Estimate total tokens from a list of chat messages

    Args:
        messages: List of message objects with 'content' field

    Returns:
        Estimated total token count
    """
    total_tokens = 0

    for message in messages:
        content = ""
        if isinstance(message, dict):
            content = message.get('content', '')
        elif hasattr(message, 'content'):
            content = message.content
        else:
            content = str(message)

        total_tokens += count_tokens(content)

    return total_tokens

def truncate_text_to_tokens(text: str, max_tokens: int, preserve_start: bool = True) -> str:
    """
    Truncate text to fit within a token limit

    Args:
        text: Input text to truncate
        max_tokens: Maximum number of tokens allowed
        preserve_start: If True, keep the beginning of the text. If False, keep the end.

    Returns:
        Truncated text that fits within the token limit
    """
    current_tokens = count_tokens(text)

    if current_tokens <= max_tokens:
        return text

    # Rough estimation: if we need to cut 50% of tokens, cut 50% of characters
    ratio = max_tokens / current_tokens
    target_length = int(len(text) * ratio * 0.9)  # 0.9 as safety margin

    if preserve_start:
        truncated = text[:target_length]
        if count_tokens(truncated) > max_tokens:
            # If still too long, cut more aggressively
            while count_tokens(truncated) > max_tokens and len(truncated) > 100:
                truncated = truncated[:int(len(truncated) * 0.9)]
        return truncated

    truncated = text[-target_length:]
    if count_tokens(truncated) > max_tokens:
        # If still too long, cut more aggressively
        while count_tokens(truncated) > max_tokens and len(truncated) > 100:
            truncated = truncated[int(len(truncated) * 0.1):]
    return truncated
