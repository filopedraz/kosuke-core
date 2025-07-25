from typing import Any

from app.services.fs_service import fs_service

from .base import Tool


class ReadFileTool(Tool):
    """
    Tool for reading file contents

    Mirrors the TypeScript readFileTool from lib/llm/tools/readFileTool.ts
    """

    @property
    def name(self) -> str:
        return "readFile"

    @property
    def description(self) -> str:
        return "Read the contents of a file in the project"

    async def execute(self, file_path: str) -> dict[str, Any]:
        try:
            print(f"🔍 Reading file: {file_path}")
            content = await fs_service.read_file(file_path)
            return {"success": True, "content": content}
        except Exception as e:
            print(f"❌ Error reading file: {file_path}, {e}")
            return {"success": False, "error": str(e)}

class CreateFileTool(Tool):
    """
    Tool for creating new files

    Mirrors the TypeScript createFileTool from lib/llm/tools/createFileTool.ts
    """

    @property
    def name(self) -> str:
        return "createFile"

    @property
    def description(self) -> str:
        return "Create a new file in the project"

    async def execute(self, file_path: str, content: str) -> dict[str, Any]:
        try:
            print(f"📝 Creating file: {file_path}")
            await fs_service.create_file(file_path, content)
            return {"success": True}
        except Exception as e:
            print(f"❌ Error creating file: {file_path}, {e}")
            return {"success": False, "error": str(e)}

class EditFileTool(Tool):
    """
    Tool for editing existing files

    Mirrors the TypeScript editFileTool from lib/llm/tools/editFileTool.ts
    """

    @property
    def name(self) -> str:
        return "editFile"

    @property
    def description(self) -> str:
        return "Edit an existing file in the project"

    async def execute(self, file_path: str, content: str) -> dict[str, Any]:
        try:
            print(f"✏️ Editing file: {file_path}")
            await fs_service.update_file(file_path, content)
            return {"success": True}
        except Exception as e:
            print(f"❌ Error editing file: {file_path}, {e}")
            return {"success": False, "error": str(e)}

class DeleteFileTool(Tool):
    """
    Tool for deleting files

    Mirrors the TypeScript deleteFileTool from lib/llm/tools/deleteFileTool.ts
    """

    @property
    def name(self) -> str:
        return "deleteFile"

    @property
    def description(self) -> str:
        return "Delete a file from the project"

    async def execute(self, file_path: str) -> dict[str, Any]:
        try:
            print(f"🗑️ Deleting file: {file_path}")
            await fs_service.delete_file(file_path)
            return {"success": True}
        except Exception as e:
            print(f"❌ Error deleting file: {file_path}, {e}")
            return {"success": False, "error": str(e)}

class CreateDirectoryTool(Tool):
    """
    Tool for creating directories

    Mirrors the TypeScript createDirectoryTool from lib/llm/tools/createDirectoryTool.ts
    """

    @property
    def name(self) -> str:
        return "createDirectory"

    @property
    def description(self) -> str:
        return "Create a new directory in the project"

    async def execute(self, dir_path: str) -> dict[str, Any]:
        try:
            print(f"📁 Creating directory: {dir_path}")
            await fs_service.create_directory(dir_path)
            return {"success": True}
        except Exception as e:
            print(f"❌ Error creating directory: {dir_path}, {e}")
            return {"success": False, "error": str(e)}

class RemoveDirectoryTool(Tool):
    """
    Tool for removing directories

    Mirrors the TypeScript removeDirectoryTool from lib/llm/tools/removeDirectoryTool.ts
    """

    @property
    def name(self) -> str:
        return "removeDirectory"

    @property
    def description(self) -> str:
        return "Remove a directory from the project"

    async def execute(self, dir_path: str) -> dict[str, Any]:
        try:
            print(f"🗑️ Removing directory: {dir_path}")
            await fs_service.delete_directory(dir_path)
            return {"success": True}
        except Exception as e:
            print(f"❌ Error removing directory: {dir_path}, {e}")
            return {"success": False, "error": str(e)}

class SearchTool(Tool):
    """
    Tool for searching files (basic implementation)

    Mirrors the TypeScript searchTool from lib/llm/tools/searchTool.ts
    """

    @property
    def name(self) -> str:
        return "search"

    @property
    def description(self) -> str:
        return "Search for files matching a pattern"

    async def execute(self, search_term: str, project_path: str | None = None) -> dict[str, Any]:
        try:
            print(f"🔎 Searching for files matching: {search_term}")

            if project_path:
                files = await fs_service.list_files_recursively(project_path)
                # Simple pattern matching
                matching_files = [f for f in files if search_term.lower() in f.lower()]
                return {"success": True, "files": matching_files}

            # Return mock results for now (can be enhanced later)
            return {
                "success": True,
                "files": [
                    "components/ui/button.tsx",
                    "components/ui/card.tsx",
                    "app/page.tsx",
                    "lib/utils.ts",
                ]
            }
        except Exception as e:
            print(f"❌ Error searching for files: {search_term}, {e}")
            return {"success": False, "error": str(e)}

# Tool registry - mirrors the TypeScript toolMap from lib/llm/tools/index.ts
TOOLS = {
    "readFile": ReadFileTool(),
    "createFile": CreateFileTool(),
    "editFile": EditFileTool(),
    "deleteFile": DeleteFileTool(),
    "createDirectory": CreateDirectoryTool(),
    "removeDirectory": RemoveDirectoryTool(),
    "search": SearchTool(),
}

def get_tool(name: str) -> Tool | None:
    """
    Get a tool by name

    Mirrors the TypeScript getTool function from lib/llm/tools/index.ts
    """
    print(f"🔍 Looking for tool with name: \"{name}\"")

    tool = TOOLS.get(name)

    if tool:
        print(f"✅ Found tool: {tool.name}")
        return tool

    print(f"❌ No tool found with name: \"{name}\"")
    print(f"🧰 Available tools: {list(TOOLS.keys())}")
    return None

def get_all_tools() -> dict[str, Tool]:
    """Get all available tools"""
    return TOOLS.copy()
