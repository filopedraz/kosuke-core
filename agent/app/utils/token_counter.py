import logging

import tiktoken

logger = logging.getLogger(__name__)


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
        logger.warning(f"Error counting tokens with tiktoken: {e}")
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
            content = message.get("content", "")
        elif hasattr(message, "content"):
            content = message.content
        else:
            content = str(message)

        total_tokens += count_tokens(content)

    return total_tokens
