from pathlib import Path

from app.models.actions import Action
from app.models.actions import ActionType
from app.models.actions import normalize_action
from app.services.fs_service import fs_service
from app.tools.file_tools import get_tool


class ActionExecutor:
    """
    Handles execution of agent actions

    Mirrors the action execution functionality from TypeScript agentActions.ts
    """

    def __init__(self, project_id: int):
        self.project_id = project_id

    async def execute_action(self, action: Action) -> bool:
        """
        Execute a single action

        Mirrors the TypeScript executeAction function from agentActions.ts
        """
        print(f"🔧 Executing action: {action.action} on {action.file_path}")
        print(f"🔧 Action details: {action.dict()}")

        try:
            # Normalize the action to ensure compatibility
            normalized_action = normalize_action(action)
            print(f"🔧 Normalized action: {normalized_action.dict()}")

            # Get the appropriate tool name (action is already a string due to use_enum_values=True)
            tool_name = str(normalized_action.action)
            print(f"🔧 Looking for tool with name: {tool_name}")

            tool = get_tool(tool_name)

            if not tool:
                print(f"❌ Unknown action: {action.action}, normalized to: {tool_name}")
                return False

            # Execute the tool with the appropriate parameters
            success = await self._execute_tool_action(normalized_action, tool)

            if not success:
                print(f"❌ Failed to {normalized_action.action} on: {normalized_action.file_path}")
                return False

            print(f"✅ Successfully executed {normalized_action.action} on {normalized_action.file_path}")
            return True

        except Exception as error:
            print(f"❌ Error in execute_action: {error}")
            return False

    async def _execute_tool_action(self, normalized_action: Action, tool) -> bool:
        """
        Execute a tool based on the action type

        Mirrors the TypeScript executeToolAction function from agentActions.ts
        """
        try:
            action_type = normalized_action.action
            full_path = self._get_full_path(normalized_action.file_path)

            # Handle file operations that require content (compare string values)
            if action_type in [ActionType.EDIT_FILE.value, ActionType.CREATE_FILE.value]:
                return await self._handle_content_action(normalized_action, tool, full_path)

            # Handle file operations that don't require content (compare string values)
            if action_type in [ActionType.DELETE_FILE.value, ActionType.REMOVE_DIRECTORY.value, ActionType.CREATE_DIRECTORY.value]:
                return await self._handle_path_action(normalized_action, tool, full_path)

            # Handle read file action (compare string values)
            if action_type == ActionType.READ_FILE.value:
                print(f"📝 Executing read on full path: {full_path}")
                result = await tool.execute(str(full_path))
                return result.get("success", False)

            # Handle search action (compare string values)
            if action_type == ActionType.SEARCH.value:
                print(f"📝 Executing search for: {normalized_action.file_path}")
                result = await tool.execute(normalized_action.file_path)
                return result.get("success", False)

            print(f"❌ Unsupported action: {action_type}")
            return False

        except Exception as error:
            print(f"❌ Error executing tool action: {error}")
            return False

    async def _handle_content_action(self, normalized_action: Action, tool, full_path: Path) -> bool:
        """Handle actions that require content (edit/create file)"""
        if not normalized_action.content:
            print(f"❌ Missing content for {normalized_action.action} action")
            return False

        print(f"📝 Executing {normalized_action.action} on full path: {full_path}")
        print(f"📝 Content length: {len(normalized_action.content)} characters")

        result = await tool.execute(str(full_path), normalized_action.content)
        return result.get("success", False)

    async def _handle_path_action(self, normalized_action: Action, tool, full_path: Path) -> bool:
        """Handle actions that only require a path (delete/create directory)"""
        print(f"📝 Executing {normalized_action.action} on full path: {full_path}")
        result = await tool.execute(str(full_path))
        return result.get("success", False)

    def _get_full_path(self, file_path: str) -> Path:
        """Get the full path for a file within the project"""
        project_path = fs_service.get_project_path(self.project_id)
        return project_path / file_path
