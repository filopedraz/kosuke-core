from typing import ClassVar

from pydantic import BaseModel
from pydantic import Field
from pydantic import validator


class ChatMessage(BaseModel):
    """Chat message model that mirrors the TypeScript ChatMessage interface"""

    role: str  # 'system' | 'user' | 'assistant'
    content: str


class ChatRequest(BaseModel):
    """Chat request model for the streaming endpoint"""

    project_id: int = Field(..., ge=0, description="Project ID must be non-negative")
    prompt: str = Field(..., min_length=1, description="Prompt cannot be empty")
    chat_history: list[ChatMessage] | None = []
    assistant_message_id: int | None = Field(None, description="Assistant message ID for webhook updates")

    # GitHub integration (mandatory)
    github_token: str = Field(..., min_length=1, description="GitHub token for auto-commit functionality")
    session_id: str | None = Field(None, description="Session ID for GitHub tracking")

    @validator("prompt")
    def validate_prompt(cls, v):  # noqa: N805
        if not v or not v.strip():
            raise ValueError("Prompt cannot be empty or whitespace only")
        return v.strip()

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
                "github_token": "ghp_xxxxxxxxxxxxxxxxxxxx",
                "session_id": "chat-session-12345",
            }
        }


class ChatSessionRequest(BaseModel):
    """Chat request model for session-aware streaming"""

    project_id: int = Field(..., ge=0, description="Project ID must be non-negative")
    session_id: str = Field(..., min_length=1, description="Session ID for isolation")
    prompt: str = Field(..., min_length=1, description="Prompt cannot be empty")
    assistant_message_id: int | None = Field(None, description="Assistant message ID for webhook updates")

    # GitHub integration (mandatory)
    github_token: str = Field(..., min_length=1, description="GitHub token for auto-commit functionality")

    @validator("prompt")
    def validate_prompt(cls, v):  # noqa: N805
        if not v or not v.strip():
            raise ValueError("Prompt cannot be empty or whitespace only")
        return v.strip()

    @validator("session_id")
    def validate_session_id(cls, v):  # noqa: N805
        if not v or not v.strip():
            raise ValueError("Session ID cannot be empty or whitespace only")
        return v.strip()

    class Config:
        # Example for API documentation
        schema_extra: ClassVar = {
            "example": {
                "project_id": 1,
                "session_id": "session_12345_67890",
                "prompt": "Create a new React component for a button",
                "github_token": "ghp_xxxxxxxxxxxxxxxxxxxx",
            }
        }
