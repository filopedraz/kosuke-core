from enum import Enum


class AgentErrorType(str, Enum):
    """Agent error types that mirror the TypeScript AgentErrorType"""

    TIMEOUT = "timeout"
    PARSING = "parsing"
    PROCESSING = "processing"
    UNKNOWN = "unknown"


class AgentError(Exception):
    """Custom AgentError class that mirrors the TypeScript AgentError"""

    def __init__(self, error_type: AgentErrorType, message: str, details: str | None = None):
        self.type = error_type
        self.message = message
        self.details = details
        super().__init__(message)


def classify_error(error: Exception) -> AgentErrorType:
    """Classify an error by type, mirrors TypeScript classifyError function"""
    if isinstance(error, AgentError):
        return error.type

    error_msg = str(error).lower()
    if "timeout" in error_msg or "timed out" in error_msg:
        return AgentErrorType.TIMEOUT

    if "parse" in error_msg or "json" in error_msg:
        return AgentErrorType.PARSING

    return AgentErrorType.UNKNOWN


def get_error_message(error: Exception, error_type: AgentErrorType) -> str:
    """Get an appropriate error message based on error type"""
    if error_type == AgentErrorType.TIMEOUT:
        return "The request took too long to process. Please try a simpler request or try again later."

    if error_type == AgentErrorType.PARSING:
        return "There was an error processing the AI response. Please try again or simplify your request."

    if error_type == AgentErrorType.PROCESSING:
        return "There was an error processing your request. Please try rephrasing it."

    if error_type == AgentErrorType.UNKNOWN:
        return f"An unexpected error occurred: {error!s}"

    return f"Error: {error!s}"
