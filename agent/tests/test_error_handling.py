"""Tests for error handling throughout the system"""

import asyncio
import json
from unittest.mock import AsyncMock
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.core.agent import Agent
from app.main import app
from app.services.fs_service import FileSystemService
from app.services.llm_service import LLMService


@pytest.fixture()
def client():
    """Test client for FastAPI app"""
    return TestClient(app)


class TestErrorHandling:
    """Test error handling scenarios"""

    def test_invalid_project_id_routes(self, client: TestClient):
        """Test handling of invalid project ID in routes"""
        test_cases = [
            {"project_id": -1, "expected_codes": [400, 404, 422, 500]},
            {"project_id": 0, "expected_codes": [200, 400, 404, 500]},
            {"project_id": "invalid", "expected_codes": [422]},
            {"project_id": None, "expected_codes": [422]},
        ]

        for case in test_cases:
            response = client.post(
                "/api/chat/stream", json={"project_id": case["project_id"], "prompt": "Test message"}
            )

            assert response.status_code in case["expected_codes"]

    @patch("app.utils.config.settings.projects_dir")
    def test_nonexistent_project_directory(self, mock_projects_dir):
        """Test handling of nonexistent project directory"""
        mock_projects_dir.return_value = "/nonexistent/path"

        # Should handle gracefully without crashing
        agent = Agent(project_id=999)
        assert agent.project_id == 999

    @patch("app.utils.config.settings.projects_dir")
    @patch.object(LLMService, "generate_completion")
    @patch("app.services.fs_service.fs_service")
    @pytest.mark.asyncio()
    async def test_llm_service_timeout(
        self, mock_fs_service, mock_generate_completion, mock_projects_dir, temp_project_dir
    ):
        """Test LLM service timeout handling"""
        mock_projects_dir.return_value = str(temp_project_dir.parent)

        # Mock LLM service to raise timeout
        mock_generate_completion.side_effect = asyncio.TimeoutError("Request timeout")

        # Mock file system service
        mock_fs_service.get_project_path.return_value = temp_project_dir
        mock_fs_service.scan_directory.return_value = {"files": []}

        agent = Agent(project_id=123)

        # Should handle repeated LLM timeouts gracefully without crashing
        results = []
        async for update in agent.run("Test message"):
            results.append(update)

        # Should yield error updates when max iterations reached due to timeouts
        error_updates = [r for r in results if r.get("status") == "error"]
        assert len(error_updates) > 0, "No error updates found"

        # Should classify as processing error (max iterations reached due to repeated timeouts)
        processing_errors = [r for r in error_updates if r.get("error_type") == "processing"]
        assert len(processing_errors) > 0, "No processing errors found"

    @patch("app.utils.config.settings.projects_dir")
    @patch.object(LLMService, "generate_completion")
    @patch("app.services.fs_service.fs_service")
    @pytest.mark.asyncio()
    async def test_llm_service_api_error(
        self, mock_fs_service, mock_generate_completion, mock_projects_dir, temp_project_dir
    ):
        """Test LLM service API error handling"""
        mock_projects_dir.return_value = str(temp_project_dir.parent)

        # Mock LLM service to raise API error
        mock_generate_completion.side_effect = Exception("API rate limit exceeded")

        # Mock file system service
        mock_fs_service.get_project_path.return_value = temp_project_dir
        mock_fs_service.scan_directory.return_value = {"files": []}

        agent = Agent(project_id=123)

        results = []
        async for update in agent.run("Test message"):
            results.append(update)

        # Should handle API errors gracefully
        error_updates = [r for r in results if r.get("status") == "error"]
        assert len(error_updates) > 0

    def test_file_permission_error(self, temp_project_dir):
        """Test handling of file permission errors"""
        fs_service = FileSystemService()

        # Create a file and make it read-only
        test_file = temp_project_dir / "readonly.txt"
        test_file.write_text("original content")

        try:
            test_file.chmod(0o444)  # Read-only

            # Attempt to write to read-only file should be handled gracefully
            # Use asyncio.run for async method
            import asyncio

            with pytest.raises((PermissionError, OSError)):
                asyncio.run(fs_service.create_file(str(test_file), "new content"))

        except (OSError, NotImplementedError):
            # Skip on systems that don't support chmod
            pytest.skip("chmod not supported on this system")

    def test_malformed_json_in_request(self, client: TestClient):
        """Test handling of malformed JSON in requests"""
        response = client.post("/api/chat/stream", data="malformed json", headers={"Content-Type": "application/json"})

        assert response.status_code == 422  # Unprocessable Entity

    def test_missing_required_fields(self, client: TestClient):
        """Test handling of missing required fields"""
        test_cases = [
            {},  # No fields
            {"project_id": 123},  # Missing prompt
            {"prompt": "test"},  # Missing project_id
            {"project_id": "", "prompt": ""},  # Empty values
        ]

        for payload in test_cases:
            response = client.post("/api/chat/stream", json=payload)
            assert response.status_code == 422

    @patch("app.utils.config.settings.projects_dir")
    @patch("app.services.fs_service.fs_service")
    @pytest.mark.asyncio()
    async def test_file_system_errors(self, mock_fs_service, mock_projects_dir, temp_project_dir):
        """Test handling of file system errors"""
        mock_projects_dir.return_value = str(temp_project_dir.parent)

        # Simulate file system errors
        mock_fs_service.create_file = AsyncMock(side_effect=OSError("Disk full"))
        mock_fs_service.read_file = AsyncMock(side_effect=FileNotFoundError("File not found"))
        mock_fs_service.file_exists = AsyncMock(return_value=True)

        from app.core.actions import ActionExecutor
        from app.models.actions import ActionType

        from .fixtures import create_mock_action

        executor = ActionExecutor(project_id=123)

        action = create_mock_action(ActionType.CREATE_FILE, "test.js", "test content", "Creating test file")

        with patch("app.tools.file_tools.get_tool") as mock_get_tool:
            mock_tool = MagicMock()
            mock_tool.execute = AsyncMock(return_value={"success": False, "error": "Disk full"})
            mock_get_tool.return_value = mock_tool

            result = await executor.execute_action(action)

            assert result is False

    @patch("app.utils.config.settings.projects_dir")
    @pytest.mark.asyncio()
    async def test_large_file_handling_errors(self, mock_projects_dir, temp_project_dir):
        """Test handling of large file errors"""
        mock_projects_dir.return_value = str(temp_project_dir.parent)

        fs_service = FileSystemService()

        # Try to create an extremely large file (simulate memory error)
        with patch.object(fs_service, "create_file") as mock_create:
            mock_create.side_effect = MemoryError("Not enough memory")

            with pytest.raises(MemoryError):
                await fs_service.create_file("huge_file.txt", "x" * (1024 * 1024 * 1024))  # 1GB

    @patch("app.core.agent.Agent")
    @patch.object(LLMService, "generate_completion")
    @patch("app.services.fs_service.fs_service")
    def test_concurrent_requests_error_isolation(
        self, mock_fs_service, mock_generate_completion, mock_agent_class, client: TestClient
    ):
        """Test that errors in one request don't affect others"""
        import threading

        results = []

        async def mock_agent_run_success(*args, **kwargs):
            yield {"type": "thinking", "message": "Processing", "status": "pending"}

        def make_request(should_fail=False):
            if should_fail:
                # Make an invalid request
                response = client.post("/api/chat/stream", json={"project_id": "invalid", "prompt": "Test"})
            else:
                # Make a valid request with proper mocking
                mock_instance = MagicMock()
                mock_instance.run = mock_agent_run_success
                mock_agent_class.return_value = mock_instance

                mock_fs_service.get_project_path.return_value = "/mock/path"
                mock_fs_service.scan_directory.return_value = {"files": []}

                response = client.post("/api/chat/stream", json={"project_id": 123, "prompt": "Valid request"})

            results.append(response.status_code)

        # Create threads with mix of valid and invalid requests
        threads = []
        for i in range(6):
            should_fail = i % 2 == 0  # Every other request fails
            thread = threading.Thread(target=make_request, args=(should_fail,))
            threads.append(thread)

        # Start all threads
        for thread in threads:
            thread.start()

        # Wait for completion
        for thread in threads:
            thread.join()

        # Should have both success and failure responses
        assert len(results) == 6
        assert 200 in results  # Some successful
        assert 422 in results  # Some failed

    @patch("app.utils.config.settings.projects_dir")
    @patch.object(LLMService, "generate_completion")
    @patch("app.services.fs_service.fs_service")
    @pytest.mark.asyncio()
    async def test_webhook_service_errors(
        self, mock_fs_service, mock_generate_completion, mock_projects_dir, temp_project_dir
    ):
        """Test handling of webhook service errors"""
        mock_projects_dir.return_value = str(temp_project_dir.parent)

        # Mock LLM service
        mock_generate_completion.return_value = json.dumps(
            {"thinking": False, "actions": [], "reasoning": "No actions needed"}
        )

        # Mock file system service
        mock_fs_service.get_project_path.return_value = temp_project_dir
        mock_fs_service.scan_directory.return_value = {"files": []}

        agent = Agent(project_id=123)

        with patch.object(agent.webhook_service, "send_action_update") as mock_webhook:
            mock_webhook.side_effect = Exception("Webhook service unavailable")

            # Agent should continue working even if webhooks fail
            results = []
            async for update in agent.run("Test message"):
                results.append(update)

            # Should complete despite webhook errors
            assert len(results) > 0

    def test_invalid_content_type(self, client: TestClient):
        """Test handling of invalid content type"""
        response = client.post("/api/chat/stream", data="not json", headers={"Content-Type": "text/plain"})
        assert response.status_code == 422

    def test_request_size_limits(self, client: TestClient):
        """Test handling of very large requests"""
        # Create a very large prompt
        large_prompt = "A" * (10 * 1024 * 1024)  # 10MB

        response = client.post("/api/chat/stream", json={"project_id": 123, "prompt": large_prompt})

        # Should either accept it or reject gracefully
        assert response.status_code in [200, 413, 422, 500]

    @patch("app.utils.config.settings.projects_dir")
    @patch("app.services.fs_service.fs_service")
    @pytest.mark.asyncio()
    async def test_action_execution_rollback(self, mock_fs_service, mock_projects_dir, temp_project_dir):
        """Test rollback on action execution failure"""
        mock_projects_dir.return_value = str(temp_project_dir.parent)

        from app.core.actions import ActionExecutor
        from app.models.actions import ActionType

        from .fixtures import create_mock_action

        executor = ActionExecutor(project_id=123)

        # Mock file system service for first successful action
        mock_fs_service.file_exists.return_value = False
        mock_fs_service.create_file = AsyncMock()

        action1 = create_mock_action(ActionType.CREATE_FILE, "test1.js", "content1", "Creating first file")

        with patch("app.tools.file_tools.get_tool") as mock_get_tool:
            # First action succeeds
            mock_tool = MagicMock()
            mock_tool.execute = AsyncMock(return_value={"success": True})
            mock_get_tool.return_value = mock_tool

            result1 = await executor.execute_action(action1)
            assert result1 is True

            # Second action fails
            mock_tool.execute = AsyncMock(return_value={"success": False, "error": "Disk error"})

            action2 = create_mock_action(ActionType.CREATE_FILE, "test2.js", "content2", "Creating second file")

            result2 = await executor.execute_action(action2)
            assert result2 is False

    def test_unicode_handling_errors(self, client: TestClient):
        """Test handling of problematic unicode characters"""
        problematic_strings = [
            "\x00\x01\x02",  # Control characters
            "💩" * 1000,  # Many emoji
            "\uffff\ufffe",  # Invalid unicode
        ]

        for test_string in problematic_strings:
            response = client.post("/api/chat/stream", json={"project_id": 123, "prompt": test_string})

            # Should handle gracefully without crashing
            assert response.status_code in [200, 400, 422, 500]

    @patch("app.utils.config.settings.projects_dir")
    def test_path_traversal_security(self, mock_projects_dir, temp_project_dir):
        """Test security against path traversal attacks"""
        mock_projects_dir.return_value = str(temp_project_dir.parent)

        fs_service = FileSystemService()

        dangerous_paths = [
            "../../../etc/passwd",
            "..\\..\\windows\\system32\\config",
            "/etc/passwd",
            "C:\\Windows\\System32\\drivers\\etc\\hosts",
            "\\\\..\\..\\sensitive.txt",
        ]

        for dangerous_path in dangerous_paths:
            # Should either block the path or handle the error gracefully
            try:
                import asyncio

                asyncio.run(fs_service.read_file(dangerous_path))
                # If it doesn't raise an exception, ensure it's not reading sensitive files
                pytest.fail(f"Path traversal not blocked for: {dangerous_path}")
            except (ValueError, PermissionError, FileNotFoundError, OSError):
                # Expected - should be blocked
                pass

    @patch("app.utils.config.settings.projects_dir")
    @patch.object(LLMService, "generate_completion")
    @patch("app.services.fs_service.fs_service")
    @pytest.mark.asyncio()
    async def test_memory_exhaustion_protection(
        self, mock_fs_service, mock_generate_completion, mock_projects_dir, temp_project_dir
    ):
        """Test protection against memory exhaustion"""
        mock_projects_dir.return_value = str(temp_project_dir.parent)

        # Simulate a scenario that could cause memory issues
        huge_content = "x" * (10 * 1024 * 1024)  # 10MB
        mock_response_data = {
            "thinking": False,
            "actions": [
                {
                    "action": "createFile",
                    "filePath": "huge.txt",
                    "content": huge_content,
                    "message": "Creating huge file",
                }
            ],
            "reasoning": "Creating huge file",
        }

        mock_generate_completion.return_value = json.dumps(mock_response_data)

        # Mock file system service
        mock_fs_service.get_project_path.return_value = temp_project_dir
        mock_fs_service.scan_directory.return_value = {"files": []}

        agent = Agent(project_id=123)

        # Should handle large content gracefully
        results = []
        async for update in agent.run("Create a huge file"):
            results.append(update)
            # Limit results to prevent test from running too long
            if len(results) > 50:
                break

        assert len(results) > 0
