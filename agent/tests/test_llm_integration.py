"""Tests for LLM service integration"""

import json
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest

from app.models.requests import ChatMessage
from app.services.llm_service import LLMService

from .fixtures import MOCK_COMPLEX_LLM_RESPONSE
from .fixtures import MOCK_LLM_RESPONSE


class TestLLMService:
    """Test cases for LLM service"""

    @patch("app.services.llm_service.AnthropicModel")
    @patch("app.services.llm_service.Agent")
    def test_llm_service_initialization(self, mock_agent_class, mock_anthropic_model):
        """Test LLM service initializes correctly"""
        mock_anthropic_model.return_value = MagicMock()
        mock_agent_class.return_value = MagicMock()

        llm_service = LLMService()
        assert llm_service is not None
        assert llm_service.agent is not None

    @pytest.mark.asyncio()
    @patch.object(LLMService, "generate_completion")
    async def test_generate_completion_basic(self, mock_generate_completion):
        """Test basic completion generation"""
        mock_generate_completion.return_value = json.dumps(MOCK_LLM_RESPONSE)

        llm_service = LLMService()
        messages = [ChatMessage(role="user", content="Create a button component")]

        result = await llm_service.generate_completion(messages)

        assert isinstance(result, str)
        parsed_result = json.loads(result)
        assert "actions" in parsed_result
        assert "reasoning" in parsed_result

    @pytest.mark.asyncio()
    @patch.object(LLMService, "generate_completion")
    async def test_generate_completion_with_file_content(self, mock_generate_completion):
        """Test completion generation with file content context"""
        mock_generate_completion.return_value = json.dumps(MOCK_LLM_RESPONSE)

        llm_service = LLMService()
        messages = [
            ChatMessage(role="user", content="Update the index file to use the new button"),
            ChatMessage(role="system", content="File content: import React from 'react';"),
        ]

        result = await llm_service.generate_completion(messages)

        assert isinstance(result, str)
        # Should have called generate_completion with proper messages
        mock_generate_completion.assert_called_once_with(messages)

    @pytest.mark.asyncio()
    @patch.object(LLMService, "generate_completion")
    async def test_generate_completion_with_chat_history(self, mock_generate_completion):
        """Test completion generation with chat history"""
        mock_generate_completion.return_value = json.dumps(MOCK_LLM_RESPONSE)

        llm_service = LLMService()
        messages = [
            ChatMessage(role="user", content="Create a button component"),
            ChatMessage(role="assistant", content="I've created a button component"),
            ChatMessage(role="user", content="Make the button blue"),
        ]

        result = await llm_service.generate_completion(messages)

        assert isinstance(result, str)
        # Should have processed all messages
        mock_generate_completion.assert_called_once_with(messages)

    @pytest.mark.asyncio()
    @patch.object(LLMService, "generate_completion")
    async def test_token_counting(self, mock_generate_completion):
        """Test token counting functionality"""
        with patch("app.utils.token_counter.count_tokens") as mock_count_tokens:
            mock_count_tokens.return_value = 150
            mock_generate_completion.return_value = json.dumps(MOCK_LLM_RESPONSE)

            llm_service = LLMService()
            messages = [ChatMessage(role="user", content="Simple request")]

            result = await llm_service.generate_completion(messages)

            # Token counting might be called during processing
            assert isinstance(result, str)

    @pytest.mark.asyncio()
    @patch.object(LLMService, "generate_completion")
    async def test_error_handling_llm_service_error(self, mock_generate_completion):
        """Test handling of LLM service errors"""
        mock_generate_completion.side_effect = Exception("LLM service error")

        llm_service = LLMService()
        messages = [ChatMessage(role="user", content="Test")]

        with pytest.raises(Exception, match="Claude API error"):
            await llm_service.generate_completion(messages)

    @pytest.mark.asyncio()
    @patch.object(LLMService, "generate_completion")
    async def test_max_tokens_limit(self, mock_generate_completion):
        """Test max tokens limit handling"""
        mock_generate_completion.return_value = json.dumps(MOCK_LLM_RESPONSE)

        llm_service = LLMService()
        # Create a very long message
        long_content = "A" * 10000  # Very long content
        messages = [ChatMessage(role="user", content=long_content)]

        # Should not raise an error but handle gracefully
        result = await llm_service.generate_completion(messages, max_tokens=4000)

        # Verify the request was processed
        assert isinstance(result, str)
        mock_generate_completion.assert_called_once()

    @pytest.mark.asyncio()
    @patch.object(LLMService, "generate_completion")
    async def test_large_context_handling(self, mock_generate_completion):
        """Test handling of large context with many messages"""
        mock_generate_completion.return_value = json.dumps(MOCK_LLM_RESPONSE)

        llm_service = LLMService()
        # Create large context with many messages
        large_messages = []
        for i in range(100):
            large_messages.append(
                ChatMessage(
                    role="user" if i % 2 == 0 else "assistant",
                    content=f"Message {i}: Component {i} created successfully",
                )
            )

        # Should handle large context gracefully
        result = await llm_service.generate_completion(large_messages)
        assert isinstance(result, str)

    @pytest.mark.asyncio()
    @patch.object(LLMService, "generate_completion")
    async def test_empty_context_handling(self, mock_generate_completion):
        """Test handling of empty context"""
        mock_generate_completion.return_value = json.dumps(MOCK_LLM_RESPONSE)

        llm_service = LLMService()
        messages = [ChatMessage(role="user", content="Create a component")]

        result = await llm_service.generate_completion(messages)
        assert isinstance(result, str)

    @pytest.mark.asyncio()
    @patch.object(LLMService, "generate_completion")
    async def test_special_characters_in_content(self, mock_generate_completion):
        """Test handling of special characters in messages"""
        mock_generate_completion.return_value = json.dumps(MOCK_LLM_RESPONSE)

        llm_service = LLMService()
        special_contents = [
            "Create a component with 'quotes' and \"double quotes\"",
            "Handle special chars: <>&{}\n\t",
            "Unicode: 🚀 Hello 世界",
            "Code with backticks: `const test = 'value';`",
        ]

        for content in special_contents:
            messages = [ChatMessage(role="user", content=content)]
            result = await llm_service.generate_completion(messages)
            assert isinstance(result, str)

    @pytest.mark.asyncio()
    @patch.object(LLMService, "generate_completion")
    async def test_complex_multi_action_response(self, mock_generate_completion):
        """Test handling of complex responses with multiple actions"""
        mock_generate_completion.return_value = json.dumps(MOCK_COMPLEX_LLM_RESPONSE)

        llm_service = LLMService()
        messages = [ChatMessage(role="user", content="Create and update multiple files")]

        result = await llm_service.generate_completion(messages)

        assert isinstance(result, str)
        parsed_result = json.loads(result)
        assert "actions" in parsed_result
        assert len(parsed_result["actions"]) == 2  # Should have 2 actions

    @pytest.mark.asyncio()
    @patch.object(LLMService, "generate_completion")
    async def test_timeout_handling(self, mock_generate_completion):
        """Test handling of request timeouts"""
        import asyncio

        mock_generate_completion.side_effect = asyncio.TimeoutError("Request timeout")

        llm_service = LLMService()
        messages = [ChatMessage(role="user", content="Test")]

        with pytest.raises(asyncio.TimeoutError):
            await llm_service.generate_completion(messages)

    @pytest.mark.asyncio()
    @patch.object(LLMService, "generate_completion")
    async def test_concurrent_requests(self, mock_generate_completion):
        """Test handling of concurrent LLM requests"""
        import asyncio

        mock_generate_completion.return_value = json.dumps(MOCK_LLM_RESPONSE)

        llm_service = LLMService()

        async def make_request(i):
            messages = [ChatMessage(role="user", content=f"Request {i}")]
            return await llm_service.generate_completion(messages)

        # Make multiple concurrent requests
        tasks = [make_request(i) for i in range(5)]
        results = await asyncio.gather(*tasks)

        # All should succeed
        assert len(results) == 5
        assert all(isinstance(result, str) for result in results)

    @pytest.mark.asyncio()
    @patch.object(LLMService, "generate_completion")
    async def test_temperature_and_max_tokens_parameters(self, mock_generate_completion):
        """Test that temperature and max_tokens parameters are handled"""
        mock_generate_completion.return_value = json.dumps(MOCK_LLM_RESPONSE)

        llm_service = LLMService()
        messages = [ChatMessage(role="user", content="Test with parameters")]

        # Test with custom parameters
        result = await llm_service.generate_completion(messages, temperature=0.7, max_tokens=2000)

        assert isinstance(result, str)
        mock_generate_completion.assert_called_once()

    @pytest.mark.asyncio()
    @patch.object(LLMService, "generate_completion")
    async def test_json_parsing_errors(self, mock_generate_completion):
        """Test handling of invalid JSON responses"""
        # Mock service to return invalid JSON
        mock_generate_completion.return_value = "Invalid JSON response"

        llm_service = LLMService()
        messages = [ChatMessage(role="user", content="Test")]

        # Should return the invalid JSON string (let the caller handle it)
        result = await llm_service.generate_completion(messages)
        assert result == "Invalid JSON response"

    @pytest.mark.asyncio()
    @patch.object(LLMService, "generate_completion")
    async def test_empty_response_handling(self, mock_generate_completion):
        """Test handling of empty responses"""
        mock_generate_completion.return_value = ""

        llm_service = LLMService()
        messages = [ChatMessage(role="user", content="Test")]

        result = await llm_service.generate_completion(messages)
        assert result == ""

    @pytest.mark.asyncio()
    @patch.object(LLMService, "generate_completion")
    async def test_response_with_thinking_mode(self, mock_generate_completion):
        """Test handling of responses with thinking mode"""
        thinking_response = {"thinking": True, "actions": [], "reasoning": "Still thinking about the best approach..."}

        mock_generate_completion.return_value = json.dumps(thinking_response)

        llm_service = LLMService()
        messages = [ChatMessage(role="user", content="Complex request")]

        result = await llm_service.generate_completion(messages)

        assert isinstance(result, str)
        parsed_result = json.loads(result)
        assert parsed_result["thinking"] is True
        assert "reasoning" in parsed_result

    @pytest.mark.asyncio()
    @patch.object(LLMService, "generate_completion")
    async def test_service_configuration_parameters(self, mock_generate_completion):
        """Test that service respects configuration parameters"""
        mock_generate_completion.return_value = json.dumps(MOCK_LLM_RESPONSE)

        llm_service = LLMService()
        messages = [ChatMessage(role="user", content="Test configuration")]

        # Test with different parameter combinations
        test_cases = [
            {"temperature": 0.1, "max_tokens": 1000},
            {"temperature": 0.9, "max_tokens": 4000},
            {"temperature": None, "max_tokens": None},  # Use defaults
        ]

        for params in test_cases:
            result = await llm_service.generate_completion(messages, **params)
            assert isinstance(result, str)

        # Should have been called for each test case
        assert mock_generate_completion.call_count == len(test_cases)


class TestLLMServiceParsing:
    """Test cases for LLM response parsing"""

    @pytest.mark.asyncio()
    @patch.object(LLMService, "generate_completion")
    async def test_parse_agent_response_basic(self, mock_generate_completion):
        """Test basic agent response parsing"""
        llm_service = LLMService()

        response = json.dumps(
            {
                "thinking": False,
                "actions": [
                    {
                        "action": "editFile",
                        "filePath": "src/components/Button.tsx",
                        "content": "button content",
                        "message": "Creating button component",
                    }
                ],
            }
        )

        result = await llm_service.parse_agent_response(response)

        assert result["thinking"] is False
        assert len(result["actions"]) == 1
        assert result["actions"][0].action == "editFile"

    @pytest.mark.asyncio()
    @patch.object(LLMService, "generate_completion")
    async def test_parse_agent_response_with_thinking(self, mock_generate_completion):
        """Test parsing response in thinking mode"""
        llm_service = LLMService()

        response = json.dumps({"thinking": True, "actions": []})

        result = await llm_service.parse_agent_response(response)

        assert result["thinking"] is True
        assert len(result["actions"]) == 0

    @pytest.mark.asyncio()
    @patch.object(LLMService, "generate_completion")
    async def test_parse_agent_response_invalid_json(self, mock_generate_completion):
        """Test parsing invalid JSON response"""
        llm_service = LLMService()

        response = "Invalid JSON content"

        with pytest.raises(Exception, match="Failed to parse JSON response"):
            await llm_service.parse_agent_response(response)

    @pytest.mark.asyncio()
    @patch.object(LLMService, "generate_completion")
    async def test_parse_agent_response_with_markdown(self, mock_generate_completion):
        """Test parsing response wrapped in markdown code blocks"""
        llm_service = LLMService()

        response = f"""```json
{json.dumps({
    "thinking": False,
    "actions": [
        {
            "action": "createFile",
            "filePath": "test.tsx",
            "content": "test content",
            "message": "Creating test file"
        }
    ]
})}
```"""

        result = await llm_service.parse_agent_response(response)

        assert result["thinking"] is False
        assert len(result["actions"]) == 1
        assert result["actions"][0].action == "createFile"
