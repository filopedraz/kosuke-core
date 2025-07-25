"""Tests for chat API routes"""

import json
from unittest.mock import AsyncMock
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app

from .fixtures import MOCK_LLM_RESPONSE


@pytest.fixture()
def client():
    """Test client for FastAPI app"""
    return TestClient(app)


# Mock the PydanticAI agent result
class MockPydanticResult:
    def __init__(self, data: str):
        self.data = data


class TestChatRoutes:
    """Test cases for chat API routes"""

    def test_health_endpoint(self, client: TestClient):
        """Test health endpoint returns correct status"""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data

    @patch("app.services.webhook_service.aiohttp.ClientSession")
    @patch("app.services.llm_service.llm_service")
    @patch("app.services.fs_service.fs_service")
    @patch("pydantic_ai.Agent")
    @pytest.mark.asyncio()
    async def test_chat_stream_endpoint_success(
        self, mock_pydantic_agent, mock_fs_service, mock_llm_service, mock_aiohttp_session, client: TestClient
    ):
        """Test streaming chat endpoint with successful response"""

        # Mock the PydanticAI agent
        mock_agent_instance = MagicMock()
        mock_agent_instance.run = AsyncMock(return_value=MockPydanticResult(json.dumps(MOCK_LLM_RESPONSE)))
        mock_pydantic_agent.return_value = mock_agent_instance

        # Mock LLM service
        mock_llm_service.generate_completion = AsyncMock(return_value=json.dumps(MOCK_LLM_RESPONSE))

        # Mock file system service
        mock_fs_service.get_project_path.return_value = MagicMock(exists=MagicMock(return_value=True))
        mock_fs_service.list_files_recursively = AsyncMock(return_value=["file1.js", "file2.ts"])

        # Mock webhook service HTTP calls
        mock_session_instance = MagicMock()
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={"success": True})
        mock_response.__aenter__ = AsyncMock(return_value=mock_response)
        mock_response.__aexit__ = AsyncMock(return_value=None)
        mock_session_instance.post.return_value = mock_response
        mock_aiohttp_session.return_value = mock_session_instance

        response = client.post("/api/chat/stream", json={"project_id": 123, "prompt": "Create a button component"})

        assert response.status_code == 200
        # Note: FastAPI streaming responses don't have predictable content-type in tests
        # We just verify the endpoint doesn't crash

    @patch("app.services.webhook_service.aiohttp.ClientSession")
    @patch("app.services.llm_service.llm_service")
    @patch("app.services.fs_service.fs_service")
    @patch("pydantic_ai.Agent")
    def test_chat_stream_endpoint_validation(
        self, mock_pydantic_agent, mock_fs_service, mock_llm_service, mock_aiohttp_session, client: TestClient
    ):
        """Test chat stream endpoint input validation"""
        # Mock all external dependencies
        mock_agent_instance = MagicMock()
        mock_agent_instance.run = AsyncMock(return_value=MockPydanticResult("test"))
        mock_pydantic_agent.return_value = mock_agent_instance

        mock_llm_service.generate_completion = AsyncMock(return_value="test")
        mock_fs_service.get_project_path.return_value = MagicMock(exists=MagicMock(return_value=True))

        mock_session_instance = MagicMock()
        mock_aiohttp_session.return_value = mock_session_instance

        # Test missing project_id
        response = client.post("/api/chat/stream", json={"prompt": "Hello"})
        assert response.status_code == 422

        # Test missing prompt
        response = client.post("/api/chat/stream", json={"project_id": 123})
        assert response.status_code == 422

        # Test invalid project_id type
        response = client.post("/api/chat/stream", json={"project_id": "invalid", "prompt": "Hello"})
        assert response.status_code == 422

        # Test empty prompt
        response = client.post("/api/chat/stream", json={"project_id": 123, "prompt": ""})
        assert response.status_code == 422

    @patch("app.services.webhook_service.aiohttp.ClientSession")
    @patch("app.services.llm_service.llm_service")
    @patch("app.services.fs_service.fs_service")
    @patch("pydantic_ai.Agent")
    @pytest.mark.asyncio()
    async def test_chat_stream_with_history(
        self, mock_pydantic_agent, mock_fs_service, mock_llm_service, mock_aiohttp_session, client: TestClient
    ):
        """Test streaming chat endpoint with chat history"""

        # Mock the PydanticAI agent
        mock_agent_instance = MagicMock()
        mock_agent_instance.run = AsyncMock(return_value=MockPydanticResult(json.dumps(MOCK_LLM_RESPONSE)))
        mock_pydantic_agent.return_value = mock_agent_instance

        # Mock services
        mock_llm_service.generate_completion = AsyncMock(return_value=json.dumps(MOCK_LLM_RESPONSE))
        mock_fs_service.get_project_path.return_value = MagicMock(exists=MagicMock(return_value=True))
        mock_fs_service.list_files_recursively = AsyncMock(return_value=["file1.js"])

        # Mock webhook service
        mock_session_instance = MagicMock()
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={"success": True})
        mock_response.__aenter__ = AsyncMock(return_value=mock_response)
        mock_response.__aexit__ = AsyncMock(return_value=None)
        mock_session_instance.post.return_value = mock_response
        mock_aiohttp_session.return_value = mock_session_instance

        response = client.post(
            "/api/chat/stream",
            json={
                "project_id": 123,
                "prompt": "Update the button component",
                "chat_history": [
                    {"role": "user", "content": "Create a button component"},
                    {"role": "assistant", "content": "I've created the button component"},
                ],
            },
        )

        assert response.status_code == 200

    @patch("app.services.webhook_service.aiohttp.ClientSession")
    @patch("app.services.llm_service.llm_service")
    @patch("app.services.fs_service.fs_service")
    @patch("pydantic_ai.Agent")
    @pytest.mark.asyncio()
    async def test_chat_stream_error_handling(
        self, mock_pydantic_agent, mock_fs_service, mock_llm_service, mock_aiohttp_session, client: TestClient
    ):
        """Test error handling in streaming endpoint"""

        # Mock the PydanticAI agent to raise an error
        mock_agent_instance = MagicMock()
        mock_agent_instance.run = AsyncMock(side_effect=Exception("Simulated agent error"))
        mock_pydantic_agent.return_value = mock_agent_instance

        # Mock services
        mock_llm_service.generate_completion = AsyncMock(side_effect=Exception("LLM error"))
        mock_fs_service.get_project_path.return_value = MagicMock(exists=MagicMock(return_value=True))

        # Mock webhook service
        mock_session_instance = MagicMock()
        mock_aiohttp_session.return_value = mock_session_instance

        response = client.post("/api/chat/stream", json={"project_id": 123, "prompt": "Create a component"})

        # Should still return 200 but include error in stream
        assert response.status_code == 200

    def test_invalid_content_type(self, client: TestClient):
        """Test handling of invalid content type"""
        response = client.post("/api/chat/stream", data="not json", headers={"Content-Type": "text/plain"})
        assert response.status_code == 422

    def test_malformed_json(self, client: TestClient):
        """Test handling of malformed JSON"""
        response = client.post(
            "/api/chat/stream",
            data='{"project_id": 123, "prompt": "test"',  # Missing closing brace
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 422

    @patch("app.services.webhook_service.aiohttp.ClientSession")
    @patch("app.services.llm_service.llm_service")
    @patch("app.services.fs_service.fs_service")
    @patch("pydantic_ai.Agent")
    @pytest.mark.asyncio()
    async def test_large_prompt_handling(
        self, mock_pydantic_agent, mock_fs_service, mock_llm_service, mock_aiohttp_session, client: TestClient
    ):
        """Test handling of very large prompts"""

        # Mock the PydanticAI agent
        mock_agent_instance = MagicMock()
        mock_agent_instance.run = AsyncMock(return_value=MockPydanticResult(json.dumps(MOCK_LLM_RESPONSE)))
        mock_pydantic_agent.return_value = mock_agent_instance

        # Mock services
        mock_llm_service.generate_completion = AsyncMock(return_value=json.dumps(MOCK_LLM_RESPONSE))
        mock_fs_service.get_project_path.return_value = MagicMock(exists=MagicMock(return_value=True))
        mock_fs_service.list_files_recursively = AsyncMock(return_value=["file1.js"])

        # Mock webhook service
        mock_session_instance = MagicMock()
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={"success": True})
        mock_response.__aenter__ = AsyncMock(return_value=mock_response)
        mock_response.__aexit__ = AsyncMock(return_value=None)
        mock_session_instance.post.return_value = mock_response
        mock_aiohttp_session.return_value = mock_session_instance

        large_prompt = "A" * 10000  # 10KB prompt
        response = client.post("/api/chat/stream", json={"project_id": 123, "prompt": large_prompt})

        assert response.status_code == 200

    @patch("app.services.webhook_service.aiohttp.ClientSession")
    @patch("app.services.llm_service.llm_service")
    @patch("app.services.fs_service.fs_service")
    @patch("pydantic_ai.Agent")
    def test_edge_case_project_ids(
        self, mock_pydantic_agent, mock_fs_service, mock_llm_service, mock_aiohttp_session, client: TestClient
    ):
        """Test edge cases for project IDs"""
        # Mock all dependencies for valid requests
        mock_agent_instance = MagicMock()
        mock_agent_instance.run = AsyncMock(return_value=MockPydanticResult("test"))
        mock_pydantic_agent.return_value = mock_agent_instance

        mock_llm_service.generate_completion = AsyncMock(return_value="test")
        mock_fs_service.get_project_path.return_value = MagicMock(exists=MagicMock(return_value=True))

        mock_session_instance = MagicMock()
        mock_aiohttp_session.return_value = mock_session_instance

        test_cases = [
            {"project_id": 0, "should_succeed": True},  # Zero ID
            {"project_id": -1, "should_succeed": False},  # Negative ID
            {"project_id": 999999999, "should_succeed": True},  # Very large ID
        ]

        for case in test_cases:
            response = client.post("/api/chat/stream", json={"project_id": case["project_id"], "prompt": "Test prompt"})

            if case["should_succeed"]:
                # Should not fail validation (business logic determines success/failure)
                assert response.status_code in [200, 404, 500]
            else:
                # Should fail validation for negative IDs
                assert response.status_code == 422

    @patch("app.services.webhook_service.aiohttp.ClientSession")
    @patch("app.services.llm_service.llm_service")
    @patch("app.services.fs_service.fs_service")
    @patch("pydantic_ai.Agent")
    @pytest.mark.asyncio()
    async def test_unicode_and_special_characters(
        self, mock_pydantic_agent, mock_fs_service, mock_llm_service, mock_aiohttp_session, client: TestClient
    ):
        """Test handling of unicode and special characters in prompts"""

        # Mock the PydanticAI agent
        mock_agent_instance = MagicMock()
        mock_agent_instance.run = AsyncMock(return_value=MockPydanticResult(json.dumps(MOCK_LLM_RESPONSE)))
        mock_pydantic_agent.return_value = mock_agent_instance

        # Mock services
        mock_llm_service.generate_completion = AsyncMock(return_value=json.dumps(MOCK_LLM_RESPONSE))
        mock_fs_service.get_project_path.return_value = MagicMock(exists=MagicMock(return_value=True))
        mock_fs_service.list_files_recursively = AsyncMock(return_value=["file1.js"])

        # Mock webhook service
        mock_session_instance = MagicMock()
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={"success": True})
        mock_response.__aenter__ = AsyncMock(return_value=mock_response)
        mock_response.__aexit__ = AsyncMock(return_value=None)
        mock_session_instance.post.return_value = mock_response
        mock_aiohttp_session.return_value = mock_session_instance

        unicode_prompts = [
            "Create a component with emoji 🚀",
            "Handle special chars: <>&\"'",
            "Unicode text: 你好世界",
            "Mixed: Hello 🌍 World с русским текстом",  # noqa: RUF001,
        ]

        for prompt in unicode_prompts:
            response = client.post("/api/chat/stream", json={"project_id": 123, "prompt": prompt})
            assert response.status_code == 200
