from pydantic import BaseModel
from typing import List, Optional

class ChatMessage(BaseModel):
    """Chat message model that mirrors the TypeScript ChatMessage interface"""
    role: str  # 'system' | 'user' | 'assistant'
    content: str

class ChatRequest(BaseModel):
    """Chat request model for the streaming endpoint"""
    project_id: int
    prompt: str
    chat_history: Optional[List[ChatMessage]] = []

    class Config:
        # Example for API documentation
        schema_extra = {
            "example": {
                "project_id": 1,
                "prompt": "Create a new React component for a button",
                "chat_history": [
                    {
                        "role": "user",
                        "content": "Previous message"
                    },
                    {
                        "role": "assistant", 
                        "content": "Previous response"
                    }
                ]
            }
        } 