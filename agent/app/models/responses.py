from pydantic import BaseModel
from typing import Optional, Literal
from .exceptions import AgentErrorType

class StreamUpdate(BaseModel):
    """Streaming update model that mirrors the TypeScript update format"""
    type: Literal["thinking", "read", "create", "edit", "delete", "error", "completed"]
    file_path: str = ""
    message: str
    status: Literal["pending", "completed", "error"]
    error_type: Optional[AgentErrorType] = None

    class Config:
        use_enum_values = True
        schema_extra = {
            "examples": [
                {
                    "type": "thinking",
                    "file_path": "",
                    "message": "Analyzing project structure...",
                    "status": "pending"
                },
                {
                    "type": "read",
                    "file_path": "app/page.tsx",
                    "message": "Reading the main page component",
                    "status": "completed"
                },
                {
                    "type": "create", 
                    "file_path": "components/Button.tsx",
                    "message": "Creating new Button component",
                    "status": "completed"
                },
                {
                    "type": "error",
                    "file_path": "components/NotFound.tsx",
                    "message": "File not found",
                    "status": "error",
                    "error_type": "processing"
                }
            ]
        }

class ChatResponse(BaseModel):
    """Simple chat response for non-streaming endpoints"""
    updates: list[StreamUpdate]
    success: bool = True
    error: Optional[str] = None 