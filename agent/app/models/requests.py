from typing import ClassVar

from pydantic import BaseModel


class ChatMessage(BaseModel):
    """Chat message model that mirrors the TypeScript ChatMessage interface"""

    role: str  # 'system' | 'user' | 'assistant'
    content: str


class ChatRequest(BaseModel):
    """Chat request model for the streaming endpoint"""

    project_id: int
    prompt: str
    chat_history: list[ChatMessage] | None = []

    class Config:
        # Example for API documentation
        schema_extra: ClassVar = {
            "example": {
                "project_id": 1,
                "prompt": "Create a new React component for a button",
                "chat_history": [
                    {"role": "user", "content": "Previous message"},
                    {"role": "assistant", "content": "Previous response"},
                ],
            }
        }
