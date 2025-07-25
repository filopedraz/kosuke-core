"""Tests for core agent functionality"""

import json
from unittest.mock import AsyncMock
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest

from app.core.actions import ActionExecutor
from app.core.agent import Agent
from app.models.actions import ActionType
from app.services.llm_service import LLMService

from .fixtures import MOCK_COMPLEX_LLM_RESPONSE
from .fixtures import MOCK_LLM_RESPONSE
from .fixtures import create_mock_action


class TestAgent:
    """Test cases for Agent class"""

    @patch("app.utils.config.settings.projects_dir")
    def test_agent_initialization(self, mock_projects_dir, temp_project_dir):
        """Test agent initializes correctly"""
        mock_projects_dir.return_value = str(temp_project_dir.parent)

        agent = Agent(project_id=123)

        assert agent.project_id == 123
        assert agent.max_iterations > 0
        assert agent.action_executor is not None
        assert agent.webhook_service is not None
        assert agent.total_actions == 0
        assert agent.total_tokens == 0

    @patch("app.utils.config.settings.projects_dir")
    @patch.object(LLMService, "generate_completion")
    @patch("app.services.fs_service.fs_service")
    @pytest.mark.asyncio()
    async def test_agent_run_simple(
        self, mock_fs_service_global, mock_generate_completion, mock_projects_dir, temp_project_dir
    ):
        """Test agent run method with simple request"""
        mock_projects_dir.return_value = str(temp_project_dir.parent)

        # Mock the LLM service generate_completion method directly
        mock_generate_completion.return_value = json.dumps(MOCK_LLM_RESPONSE)

        # Mock file system service
        mock_fs_service_global.get_project_path.return_value = temp_project_dir
        mock_fs_service_global.scan_directory.return_value = {"files": []}

        agent = Agent(project_id=123)

        # Mock the action executor to prevent real file operations
        with patch.object(agent.action_executor, "execute_action") as mock_execute:
            mock_execute.return_value = True

            # Mock webhook service to prevent real webhook calls
            with patch.object(agent.webhook_service, "send_action_update") as mock_webhook:
                mock_webhook.return_value = None

                # Collect streaming results
                results = []
                async for update in agent.run("Create a button component"):
                    results.append(update)

                # Verify we got streaming updates
                assert len(results) > 0

                # LLM service should have been called
                assert mock_generate_completion.call_count >= 1

    @patch("app.utils.config.settings.projects_dir")
    @patch.object(LLMService, "generate_completion")
    @patch("app.services.fs_service.fs_service")
    @pytest.mark.asyncio()
    async def test_agent_run_with_multiple_actions(
        self, mock_fs_service_global, mock_generate_completion, mock_projects_dir, temp_project_dir
    ):
        """Test agent run with multiple actions"""
        mock_projects_dir.return_value = str(temp_project_dir.parent)

        # Mock the LLM service with complex response
        mock_generate_completion.return_value = json.dumps(MOCK_COMPLEX_LLM_RESPONSE)

        # Mock file system service
        mock_fs_service_global.get_project_path.return_value = temp_project_dir
        mock_fs_service_global.scan_directory.return_value = {"files": []}

        agent = Agent(project_id=123)

        # Mock the action executor to prevent real file operations
        with patch.object(agent.action_executor, "execute_action") as mock_execute:
            mock_execute.return_value = True

            # Mock webhook service to prevent real webhook calls
            with patch.object(agent.webhook_service, "send_action_update") as mock_webhook:
                mock_webhook.return_value = None

                results = []
                async for update in agent.run("Create components and update files"):
                    results.append(update)

                # Should have called execute_action multiple times for complex response
                assert mock_execute.call_count >= 2  # At least 2 actions from MOCK_COMPLEX_LLM_RESPONSE

    @patch("app.utils.config.settings.projects_dir")
    @patch.object(LLMService, "generate_completion")
    @patch("app.services.fs_service.fs_service")
    @pytest.mark.asyncio()
    async def test_agent_error_handling(
        self, mock_fs_service_global, mock_generate_completion, mock_projects_dir, temp_project_dir
    ):
        """Test agent error handling"""
        mock_projects_dir.return_value = str(temp_project_dir.parent)

        # Mock the LLM service to raise an error
        mock_generate_completion.side_effect = Exception("LLM service error")

        # Mock file system service
        mock_fs_service_global.get_project_path.return_value = temp_project_dir
        mock_fs_service_global.scan_directory.return_value = {"files": []}

        agent = Agent(project_id=123)

        results = []
        async for update in agent.run("Create a component"):
            results.append(update)

        # Should have error handling
        error_updates = [r for r in results if r.get("status") == "error"]
        assert len(error_updates) > 0

    @patch("app.utils.config.settings.projects_dir")
    @patch.object(LLMService, "generate_completion")
    @patch("app.services.fs_service.fs_service")
    @pytest.mark.asyncio()
    async def test_agent_max_iterations(
        self, mock_fs_service_global, mock_generate_completion, mock_projects_dir, temp_project_dir
    ):
        """Test agent respects max iterations limit"""
        mock_projects_dir.return_value = str(temp_project_dir.parent)

        # Mock the LLM service
        mock_generate_completion.return_value = json.dumps(MOCK_LLM_RESPONSE)

        # Mock file system service
        mock_fs_service_global.get_project_path.return_value = temp_project_dir
        mock_fs_service_global.scan_directory.return_value = {"files": []}

        # Create agent with low max iterations
        agent = Agent(project_id=123)
        agent.max_iterations = 2

        # Mock the action executor to prevent real file operations
        with patch.object(agent.action_executor, "execute_action") as mock_execute:
            mock_execute.return_value = True

            # Mock webhook service to prevent real webhook calls
            with patch.object(agent.webhook_service, "send_action_update") as mock_webhook:
                mock_webhook.return_value = None

                results = []
                async for update in agent.run("Keep creating components"):
                    results.append(update)

                # Should have completed (respecting max iterations)
                assert len(results) > 0

                # Should have called LLM service limited times due to max_iterations
                assert mock_generate_completion.call_count <= agent.max_iterations


class TestActionExecutor:
    """Test cases for ActionExecutor class"""

    @patch("app.utils.config.settings.projects_dir")
    def test_action_executor_initialization(self, mock_projects_dir, temp_project_dir):
        """Test ActionExecutor initializes correctly"""
        mock_projects_dir.return_value = str(temp_project_dir.parent)

        executor = ActionExecutor(project_id=123)
        assert executor.project_id == 123

    @patch("app.utils.config.settings.projects_dir")
    @patch("app.tools.file_tools.get_tool")
    @pytest.mark.asyncio()
    async def test_execute_create_file_action(self, mock_get_tool, mock_projects_dir, temp_project_dir):
        """Test executing create file action"""
        mock_projects_dir.return_value = str(temp_project_dir.parent)

        executor = ActionExecutor(project_id=123)

        # Create proper Action object
        action = create_mock_action(
            ActionType.CREATE_FILE,
            "src/components/Button.tsx",
            "export const Button = () => <button>Click me</button>;",
            "Creating button component",
        )

        # Mock the tool
        mock_tool = MagicMock()
        mock_tool.execute = AsyncMock(return_value={"success": True})
        mock_get_tool.return_value = mock_tool

        result = await executor.execute_action(action)

        assert result is True
        mock_tool.execute.assert_called_once()

    @patch("app.utils.config.settings.projects_dir")
    @patch("app.tools.file_tools.get_tool")
    @pytest.mark.asyncio()
    async def test_execute_edit_file_action(self, mock_get_tool, mock_projects_dir, temp_project_dir):
        """Test executing edit file action"""
        mock_projects_dir.return_value = str(temp_project_dir.parent)

        executor = ActionExecutor(project_id=123)

        # Create proper Action object
        action = create_mock_action(ActionType.EDIT_FILE, "src/test.js", "const new = 'updated';", "Updating test file")
        action.match = "const old = 'value';"  # Add match field for edit operations

        # Mock the tool
        mock_tool = MagicMock()
        mock_tool.execute = AsyncMock(return_value={"success": True})
        mock_get_tool.return_value = mock_tool

        result = await executor.execute_action(action)

        assert result is True
        mock_tool.execute.assert_called_once()

    @patch("app.utils.config.settings.projects_dir")
    @patch("app.tools.file_tools.get_tool")
    @pytest.mark.asyncio()
    async def test_execute_unknown_action_type(self, mock_get_tool, mock_projects_dir, temp_project_dir):
        """Test executing when tool is not found"""
        mock_projects_dir.return_value = str(temp_project_dir.parent)

        executor = ActionExecutor(project_id=123)

        action = create_mock_action(
            ActionType.READ_FILE,  # Valid action type
            "test.txt",
            message="Testing unknown tool",
        )

        # Mock get_tool to return None (tool not found)
        mock_get_tool.return_value = None

        result = await executor.execute_action(action)

        assert result is False

    @patch("app.utils.config.settings.projects_dir")
    @patch("app.tools.file_tools.get_tool")
    @pytest.mark.asyncio()
    async def test_execute_action_tool_error(self, mock_get_tool, mock_projects_dir, temp_project_dir):
        """Test executing action when tool raises an error"""
        mock_projects_dir.return_value = str(temp_project_dir.parent)

        executor = ActionExecutor(project_id=123)

        action = create_mock_action(ActionType.READ_FILE, "nonexistent.js", message="Testing file error")

        # Mock tool to return failure
        mock_tool = MagicMock()
        mock_tool.execute = AsyncMock(return_value={"success": False, "error": "File not found"})
        mock_get_tool.return_value = mock_tool

        result = await executor.execute_action(action)

        assert result is False

    @patch("app.utils.config.settings.projects_dir")
    @patch("app.tools.file_tools.get_tool")
    @pytest.mark.asyncio()
    async def test_action_executor_success_flow(self, mock_get_tool, mock_projects_dir, temp_project_dir):
        """Test successful action execution flow"""
        mock_projects_dir.return_value = str(temp_project_dir.parent)

        executor = ActionExecutor(project_id=123)

        action = create_mock_action(ActionType.CREATE_FILE, "src/test.tsx", "test content", "Creating test file")

        # Mock successful tool execution
        mock_tool = MagicMock()
        mock_tool.execute = AsyncMock(return_value={"success": True})
        mock_get_tool.return_value = mock_tool

        result = await executor.execute_action(action)

        assert result is True
        mock_tool.execute.assert_called_once_with(action)
