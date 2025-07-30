"""
Agent tools for file system operations using native Anthropic tool calling

This module contains tool definitions and execution functions for the native
Anthropic SDK agent to interact with the file system.
"""

from app.services.fs_service import fs_service


def get_anthropic_tools(project_id: int) -> list[dict]:
    """Get Anthropic tool definitions for file system operations"""
    return [
        {
            "name": "read_file",
            "description": "Read the contents of a file to understand existing code before making changes",
            "input_schema": {
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Path to the file to read (relative to project root)",
                    }
                },
                "required": ["file_path"],
            },
        },
        {
            "name": "create_file",
            "description": "Create a new file with content",
            "input_schema": {
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Path where to create the file (relative to project root)",
                    },
                    "content": {"type": "string", "description": "Content to write to the file"},
                },
                "required": ["file_path", "content"],
            },
        },
        {
            "name": "edit_file",
            "description": "Edit an existing file with new content",
            "input_schema": {
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Path to the file to edit (relative to project root)",
                    },
                    "content": {"type": "string", "description": "New content for the file"},
                },
                "required": ["file_path", "content"],
            },
        },
        {
            "name": "delete_file",
            "description": "Delete a file",
            "input_schema": {
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Path to the file to delete (relative to project root)",
                    }
                },
                "required": ["file_path"],
            },
        },
        {
            "name": "create_directory",
            "description": "Create a new directory",
            "input_schema": {
                "type": "object",
                "properties": {
                    "dir_path": {
                        "type": "string",
                        "description": "Path where to create the directory (relative to project root)",
                    }
                },
                "required": ["dir_path"],
            },
        },
        {
            "name": "remove_directory",
            "description": "Remove a directory and all its contents",
            "input_schema": {
                "type": "object",
                "properties": {
                    "dir_path": {
                        "type": "string",
                        "description": "Path to the directory to remove (relative to project root)",
                    }
                },
                "required": ["dir_path"],
            },
        },
        {
            "name": "task_completed",
            "description": "Call this when the task is completely finished",
            "input_schema": {
                "type": "object",
                "properties": {
                    "summary": {"type": "string", "description": "A detailed summary of what was accomplished"},
                    "files_modified": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of files that were created, edited, or deleted",
                        "default": [],
                    },
                },
                "required": ["summary"],
            },
        },
    ]


async def execute_tool(tool_name: str, tool_input: dict, project_id: int) -> str:
    """Execute a tool function with the given input"""
    try:
        # Tool execution mapping
        tool_map = {
            "read_file": lambda: _read_file(project_id, tool_input["file_path"]),
            "create_file": lambda: _create_file(project_id, tool_input["file_path"], tool_input["content"]),
            "edit_file": lambda: _edit_file(project_id, tool_input["file_path"], tool_input["content"]),
            "delete_file": lambda: _delete_file(project_id, tool_input["file_path"]),
            "create_directory": lambda: _create_directory(project_id, tool_input["dir_path"]),
            "remove_directory": lambda: _remove_directory(project_id, tool_input["dir_path"]),
            "task_completed": lambda: _task_completed(
                project_id, tool_input["summary"], tool_input.get("files_modified", [])
            ),
        }

        if tool_name in tool_map:
            return await tool_map[tool_name]()

        return f"Unknown tool: {tool_name}"
    except Exception as e:
        error_msg = f"Error executing {tool_name}: {e}"
        print(f"❌ {error_msg}")
        return error_msg


# Tool implementation functions
async def _read_file(project_id: int, file_path: str) -> str:
    """Read the contents of a file"""
    try:
        project_path = fs_service.get_project_path(project_id)
        full_path = project_path / file_path
        print(f"🔍 Reading file: {full_path}")
        return await fs_service.read_file(str(full_path))
    except Exception as e:
        print(f"❌ Error reading file: {file_path}, {e}")
        raise Exception(f"Failed to read {file_path}: {e}") from e


async def _create_file(project_id: int, file_path: str, content: str) -> str:
    """Create a new file"""
    try:
        project_path = fs_service.get_project_path(project_id)
        full_path = project_path / file_path
        print(f"📝 Creating file: {full_path}")
        await fs_service.create_file(str(full_path), content)
        return f"Successfully created {file_path}"
    except Exception as e:
        print(f"❌ Error creating file: {file_path}, {e}")
        raise Exception(f"Failed to create {file_path}: {e}") from e


async def _edit_file(project_id: int, file_path: str, content: str) -> str:
    """Edit a file with new content"""
    try:
        project_path = fs_service.get_project_path(project_id)
        full_path = project_path / file_path
        print(f"✏️ Editing file: {full_path}")
        await fs_service.update_file(str(full_path), content)
        return f"Successfully edited {file_path}"
    except Exception as e:
        print(f"❌ Error editing file: {file_path}, {e}")
        raise Exception(f"Failed to edit {file_path}: {e}") from e


async def _delete_file(project_id: int, file_path: str) -> str:
    """Delete a file"""
    try:
        project_path = fs_service.get_project_path(project_id)
        full_path = project_path / file_path
        print(f"🗑️ Deleting file: {full_path}")
        await fs_service.delete_file(str(full_path))
        return f"Successfully deleted {file_path}"
    except Exception as e:
        print(f"❌ Error deleting file: {file_path}, {e}")
        raise Exception(f"Failed to delete {file_path}: {e}") from e


async def _create_directory(project_id: int, dir_path: str) -> str:
    """Create a new directory"""
    try:
        project_path = fs_service.get_project_path(project_id)
        full_path = project_path / dir_path
        print(f"📁 Creating directory: {full_path}")
        await fs_service.create_directory(str(full_path))
        return f"Successfully created directory {dir_path}"
    except Exception as e:
        print(f"❌ Error creating directory: {dir_path}, {e}")
        raise Exception(f"Failed to create directory {dir_path}: {e}") from e


async def _remove_directory(project_id: int, dir_path: str) -> str:
    """Remove a directory"""
    try:
        project_path = fs_service.get_project_path(project_id)
        full_path = project_path / dir_path
        print(f"🗑️ Removing directory: {full_path}")
        await fs_service.delete_directory(str(full_path))
        return f"Successfully removed directory {dir_path}"
    except Exception as e:
        print(f"❌ Error removing directory: {dir_path}, {e}")
        raise Exception(f"Failed to remove directory {dir_path}: {e}") from e


async def _task_completed(project_id: int, summary: str, files_modified: list[str] | None = None) -> str:
    """Call this tool when the task is completely finished"""
    try:
        print(f"✅ Task completed! Summary: {summary}")
        if files_modified:
            print(f"📁 Files modified: {', '.join(files_modified)}")

        # This tool call signals completion to the agent
        return f"Task completed successfully! Summary: {summary}"
    except Exception as e:
        print(f"❌ Error in task_completed: {e}")
        return f"Task completion recorded with error: {e}"


# Export the main function
__all__ = ["get_anthropic_tools", "execute_tool"]
