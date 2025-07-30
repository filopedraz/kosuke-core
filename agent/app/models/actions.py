from enum import Enum
from typing import Literal

from pydantic import BaseModel
from pydantic import Field


class ActionType(str, Enum):
    """Action types that mirror the TypeScript ActionType"""

    READ_FILE = "read"
    EDIT_FILE = "edit"
    CREATE_FILE = "create"
    DELETE_FILE = "delete"
    CREATE_DIRECTORY = "createDir"
    REMOVE_DIRECTORY = "removeDir"
    SEARCH = "search"


class Action(BaseModel):
    """Action model that mirrors the TypeScript Action interface"""

    action: ActionType
    file_path: str = Field(alias="filePath")
    content: str | None = None
    match: str | None = None
    message: str

    class Config:
        populate_by_name = True
        use_enum_values = True


class ActionExecutionResult(BaseModel):
    """Result of executing actions, mirrors TypeScript interface"""

    success: bool
    error: str | None = None
    error_type: str | None = None
    error_details: str | None = None
    actions: list[Action] | None = None


# New Structured Response Types for Pydantic AI
class FileOperation(BaseModel):
    """Structured file operation for Pydantic AI tools"""

    operation: Literal["read", "edit", "create", "delete", "createDir", "removeDir"]
    file_path: str
    content: str | None = None
    reasoning: str


class AgentResponse(BaseModel):
    """Structured agent response with thinking and actions"""

    thinking: str | None = None  # Extracted from thinking blocks
    actions: list[FileOperation] = []
    reasoning: str | None = None  # Why these actions were chosen
    complete: bool = False  # Whether the task is complete


class StreamChunk(BaseModel):
    """Structured streaming chunk"""

    type: Literal[
        "thinking",
        "thinking_start",
        "thinking_content",
        "reasoning",
        "reasoning_start",
        "reasoning_content",
        "text",
        "action",
        "operation_start",
        "operation_complete",
        "complete",
        "error",
    ]
    content: str | None = None
    file_path: str | None = None
    operation: str | None = None
    status: Literal["pending", "completed", "error"] | None = None


def normalize_action(action: Action) -> Action:
    """Normalize an action by cleaning up the file path"""
    # Remove leading and trailing whitespace
    file_path = action.file_path.strip()

    # Remove leading slashes
    if file_path.startswith("/"):
        file_path = file_path[1:]

    # Remove any instances of './' at the beginning
    if file_path.startswith("./"):
        file_path = file_path[2:]

    # Create a new action with the normalized path
    return Action(
        action=action.action,
        file_path=file_path,
        content=action.content,
        match=action.match,
        message=action.message or "",
    )


def is_valid_action(action_data: dict) -> bool:
    """Validate if an action object has all required fields"""
    try:
        Action(**action_data)
        return True
    except Exception:
        return False
