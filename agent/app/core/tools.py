"""
Agent tools for file system operations

This module contains all the tool functions that the Pydantic AI agent
can use to interact with the file system and perform various operations.
"""

from pydantic_ai import RunContext

from app.services.fs_service import fs_service


async def read_file(ctx: RunContext[int], file_path: str) -> str:
    """Read the contents of a file to understand existing code before making changes"""
    try:
        project_path = fs_service.get_project_path(ctx.deps)
        full_path = project_path / file_path
        print(f"🔍 Reading file: {full_path}")
        return await fs_service.read_file(str(full_path))
    except Exception as e:
        print(f"❌ Error reading file: {file_path}, {e}")
        raise Exception(f"Failed to read {file_path}: {e}") from e


async def edit_file(ctx: RunContext[int], file_path: str, content: str) -> str:
    """Edit a file with new content"""
    try:
        project_path = fs_service.get_project_path(ctx.deps)
        full_path = project_path / file_path
        print(f"✏️ Editing file: {full_path}")
        await fs_service.update_file(str(full_path), content)
        return f"Successfully edited {file_path}"
    except Exception as e:
        print(f"❌ Error editing file: {file_path}, {e}")
        raise Exception(f"Failed to edit {file_path}: {e}") from e


async def create_file(ctx: RunContext[int], file_path: str, content: str) -> str:
    """Create a new file"""
    try:
        project_path = fs_service.get_project_path(ctx.deps)
        full_path = project_path / file_path
        print(f"📝 Creating file: {full_path}")
        await fs_service.create_file(str(full_path), content)
        return f"Successfully created {file_path}"
    except Exception as e:
        print(f"❌ Error creating file: {file_path}, {e}")
        raise Exception(f"Failed to create {file_path}: {e}") from e


async def delete_file(ctx: RunContext[int], file_path: str) -> str:
    """Delete a file"""
    try:
        project_path = fs_service.get_project_path(ctx.deps)
        full_path = project_path / file_path
        print(f"🗑️ Deleting file: {full_path}")
        await fs_service.delete_file(str(full_path))
        return f"Successfully deleted {file_path}"
    except Exception as e:
        print(f"❌ Error deleting file: {file_path}, {e}")
        raise Exception(f"Failed to delete {file_path}: {e}") from e


async def create_directory(ctx: RunContext[int], dir_path: str) -> str:
    """Create a new directory"""
    try:
        project_path = fs_service.get_project_path(ctx.deps)
        full_path = project_path / dir_path
        print(f"📁 Creating directory: {full_path}")
        await fs_service.create_directory(str(full_path))
        return f"Successfully created directory {dir_path}"
    except Exception as e:
        print(f"❌ Error creating directory: {dir_path}, {e}")
        raise Exception(f"Failed to create directory {dir_path}: {e}") from e


async def remove_directory(ctx: RunContext[int], dir_path: str) -> str:
    """Remove a directory"""
    try:
        project_path = fs_service.get_project_path(ctx.deps)
        full_path = project_path / dir_path
        print(f"🗑️ Removing directory: {full_path}")
        await fs_service.delete_directory(str(full_path))
        return f"Successfully removed directory {dir_path}"
    except Exception as e:
        print(f"❌ Error removing directory: {dir_path}, {e}")
        raise Exception(f"Failed to remove directory {dir_path}: {e}") from e


async def task_completed(ctx: RunContext[int], summary: str, files_modified: list[str] | None = None) -> str:
    """
    Call this tool when the task is completely finished.

    Args:
        summary: A detailed summary of what was accomplished and changes made
        files_modified: List of files that were created, edited, or deleted (optional)
    """
    try:
        print(f"✅ Task completed! Summary: {summary}")
        if files_modified:
            print(f"📁 Files modified: {', '.join(files_modified)}")

        # This tool call signals completion to the agent
        return f"Task completed successfully! Summary: {summary}"
    except Exception as e:
        print(f"❌ Error in task_completed: {e}")
        return f"Task completion recorded with error: {e}"


# Export all tools for easy importing
__all__ = [
    "read_file",
    "edit_file",
    "create_file",
    "delete_file",
    "create_directory",
    "remove_directory",
    "task_completed",
]
