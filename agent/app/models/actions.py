from enum import Enum

from pydantic import BaseModel
from pydantic import Field


class ActionType(str, Enum):
    """Action types that mirror the TypeScript ActionType"""

    READ_FILE = "readFile"
    EDIT_FILE = "editFile"
    CREATE_FILE = "createFile"
    DELETE_FILE = "deleteFile"
    CREATE_DIRECTORY = "createDirectory"
    REMOVE_DIRECTORY = "removeDirectory"
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
