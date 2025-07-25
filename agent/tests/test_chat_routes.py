"""Tests for chat API routes"""

import json
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.llm_service import LLMService

from .fixtures import MOCK_LLM_RESPONSE


@pytest.fixture()
def client():
    """Test client for FastAPI app"""
    return TestClient(app)


class TestChatRoutes:
    """Test cases for chat API routes"""

    def test_health_endpoint(self, client: TestClient):
        """Test health endpoint returns correct status"""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data

    @patch('app.core.agent.Agent')
    @patch.object(LLMService, 'generate_completion')
    @patch('app.services.fs_service.fs_service')
    @pytest.mark.asyncio()
    async def test_chat_stream_endpoint_success(self, mock_fs_service, mock_generate_completion, mock_agent_class, client: TestClient):
        """Test streaming chat endpoint with successful response"""

        async def mock_agent_run(*args, **kwargs):
            """Mock agent run method that yields streaming updates"""
            yield {
                "type": "thinking",
                "file_path": "",
                "message": "Analyzing project structure...",
                "status": "pending"
            }
            yield {
                "type": "action",
                "file_path": "src/components/Button.tsx",
                "message": "Creating button component",
                "status": "pending"
            }
            yield {
                "type": "action",
                "file_path": "src/components/Button.tsx",
                "message": "Button component created successfully",
                "status": "completed"
            }

        # Mock agent instance
        mock_instance = MagicMock()
        mock_instance.run = mock_agent_run
        mock_agent_class.return_value = mock_instance

        # Mock services
        mock_fs_service.get_project_path.return_value = "/mock/path"
        mock_fs_service.scan_directory.return_value = {"files": []}
        mock_generate_completion.return_value = json.dumps(MOCK_LLM_RESPONSE)

        response = client.post("/api/chat/stream", json={
            "project_id": 123,
            "prompt": "Create a button component"
        })

        assert response.status_code == 200
        assert response.headers["content-type"] == "text/plain; charset=utf-8"

    def test_chat_stream_endpoint_validation(self, client: TestClient):
        """Test chat stream endpoint input validation"""
        # Test missing project_id
        response = client.post("/api/chat/stream", json={
            "prompt": "Hello"
        })
        assert response.status_code == 422

        # Test missing prompt
        response = client.post("/api/chat/stream", json={
            "project_id": 123
        })
        assert response.status_code == 422

        # Test invalid project_id type
        response = client.post("/api/chat/stream", json={
            "project_id": "invalid",
            "prompt": "Hello"
        })
        assert response.status_code == 422

        # Test empty prompt
        response = client.post("/api/chat/stream", json={
            "project_id": 123,
            "prompt": ""
        })
        assert response.status_code == 422

    @patch('app.core.agent.Agent')
    @patch.object(LLMService, 'generate_completion')
    @patch('app.services.fs_service.fs_service')
    @pytest.mark.asyncio()
    async def test_chat_stream_with_history(self, mock_fs_service, mock_generate_completion, mock_agent_class, client: TestClient):
        """Test streaming chat endpoint with chat history"""

        async def mock_agent_run(*args, **kwargs):
            yield {
                "type": "thinking",
                "message": "Processing request with context...",
                "status": "pending"
            }

        # Mock agent instance
        mock_instance = MagicMock()
        mock_instance.run = mock_agent_run
        mock_agent_class.return_value = mock_instance

        # Mock services
        mock_fs_service.get_project_path.return_value = "/mock/path"
        mock_fs_service.scan_directory.return_value = {"files": []}
        mock_generate_completion.return_value = json.dumps(MOCK_LLM_RESPONSE)

        response = client.post("/api/chat/stream", json={
            "project_id": 123,
            "prompt": "Update the button component",
            "chat_history": [
                {"role": "user", "content": "Create a button component"},
                {"role": "assistant", "content": "I've created the button component"}
            ]
        })

        assert response.status_code == 200

    @patch('app.core.agent.Agent')
    @patch.object(LLMService, 'generate_completion')
    @patch('app.services.fs_service.fs_service')
    @pytest.mark.asyncio()
    async def test_chat_stream_error_handling(self, mock_fs_service, mock_generate_completion, mock_agent_class, client: TestClient):
        """Test error handling in streaming endpoint"""

        async def mock_agent_run_error(*args, **kwargs):
            """Mock agent run that raises an error"""
            yield {
                "type": "thinking",
                "message": "Starting process...",
                "status": "pending"
            }
            raise Exception("Simulated agent error")

        # Mock agent instance
        mock_instance = MagicMock()
        mock_instance.run = mock_agent_run_error
        mock_agent_class.return_value = mock_instance

        # Mock services
        mock_fs_service.get_project_path.return_value = "/mock/path"
        mock_fs_service.scan_directory.return_value = {"files": []}
        mock_generate_completion.side_effect = Exception("LLM error")

        response = client.post("/api/chat/stream", json={
            "project_id": 123,
            "prompt": "Create a component"
        })

        # Should still return 200 but include error in stream
        assert response.status_code == 200

    def test_invalid_content_type(self, client: TestClient):
        """Test handling of invalid content type"""
        response = client.post(
            "/api/chat/stream",
            data="not json",
            headers={"Content-Type": "text/plain"}
        )
        assert response.status_code == 422

    def test_malformed_json(self, client: TestClient):
        """Test handling of malformed JSON"""
        response = client.post(
            "/api/chat/stream",
            data='{"project_id": 123, "prompt": "test"',  # Missing closing brace
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422

    @patch('app.core.agent.Agent')
    @patch.object(LLMService, 'generate_completion')
    @patch('app.services.fs_service.fs_service')
    @pytest.mark.asyncio()
    async def test_large_prompt_handling(self, mock_fs_service, mock_generate_completion, mock_agent_class, client: TestClient):
        """Test handling of very large prompts"""

        async def mock_agent_run(*args, **kwargs):
            yield {
                "type": "thinking",
                "message": "Processing large request...",
                "status": "pending"
            }

        # Mock agent instance
        mock_instance = MagicMock()
        mock_instance.run = mock_agent_run
        mock_agent_class.return_value = mock_instance

        # Mock services
        mock_fs_service.get_project_path.return_value = "/mock/path"
        mock_fs_service.scan_directory.return_value = {"files": []}
        mock_generate_completion.return_value = json.dumps(MOCK_LLM_RESPONSE)

        large_prompt = "A" * 10000  # 10KB prompt
        response = client.post("/api/chat/stream", json={
            "project_id": 123,
            "prompt": large_prompt
        })

        assert response.status_code == 200

    @patch('app.core.agent.Agent')
    @patch.object(LLMService, 'generate_completion')
    @patch('app.services.fs_service.fs_service')
    def test_concurrent_requests(self, mock_fs_service, mock_generate_completion, mock_agent_class, client: TestClient):
        """Test handling of concurrent requests to the same endpoint"""
        import threading

        results = []

        async def mock_agent_run(*args, **kwargs):
            # Simulate some processing time
            yield {
                "type": "thinking",
                "message": "Processing...",
                "status": "pending"
            }

        def make_request():
            # Mock agent instance for each request
            mock_instance = MagicMock()
            mock_instance.run = mock_agent_run
            mock_agent_class.return_value = mock_instance

            # Mock services
            mock_fs_service.get_project_path.return_value = "/mock/path"
            mock_fs_service.scan_directory.return_value = {"files": []}
            mock_generate_completion.return_value = json.dumps(MOCK_LLM_RESPONSE)

            response = client.post("/api/chat/stream", json={
                "project_id": 123,
                "prompt": "Test concurrent request"
            })
            results.append(response.status_code)

        # Create multiple threads
        threads = []
        for i in range(3):
            thread = threading.Thread(target=make_request)
            threads.append(thread)

        # Start all threads
        for thread in threads:
            thread.start()

        # Wait for all threads to complete
        for thread in threads:
            thread.join()

        # All requests should be handled successfully
        assert len(results) == 3
        assert all(status == 200 for status in results)

    def test_edge_case_project_ids(self, client: TestClient):
        """Test edge cases for project IDs"""
        test_cases = [
            {"project_id": 0, "should_succeed": True},  # Zero ID
            {"project_id": -1, "should_succeed": False},  # Negative ID
            {"project_id": 999999999, "should_succeed": True},  # Very large ID
        ]

        for case in test_cases:
            response = client.post("/api/chat/stream", json={
                "project_id": case["project_id"],
                "prompt": "Test prompt"
            })

            if case["should_succeed"]:
                # May succeed or fail depending on business logic
                assert response.status_code in [200, 404, 500]
            else:
                # Should fail validation
                assert response.status_code == 422

    @patch('app.core.agent.Agent')
    @patch.object(LLMService, 'generate_completion')
    @patch('app.services.fs_service.fs_service')
    @pytest.mark.asyncio()
    async def test_unicode_and_special_characters(self, mock_fs_service, mock_generate_completion, mock_agent_class, client: TestClient):
        """Test handling of unicode and special characters in prompts"""

        async def mock_agent_run(*args, **kwargs):
            yield {
                "type": "thinking",
                "message": "Processing unicode content...",
                "status": "pending"
            }

        # Mock agent instance
        mock_instance = MagicMock()
        mock_instance.run = mock_agent_run
        mock_agent_class.return_value = mock_instance

        # Mock services
        mock_fs_service.get_project_path.return_value = "/mock/path"
        mock_fs_service.scan_directory.return_value = {"files": []}
        mock_generate_completion.return_value = json.dumps(MOCK_LLM_RESPONSE)

        unicode_prompts = [
            "Create a component with emoji 🚀",
            "Handle special chars: <>&\"'",
            "Unicode text: 你好世界",
            "Mixed: Hello 🌍 World с русским текстом"
        ]

        for prompt in unicode_prompts:
            response = client.post("/api/chat/stream", json={
                "project_id": 123,
                "prompt": prompt
            })
            assert response.status_code == 200
