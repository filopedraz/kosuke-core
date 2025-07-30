# Ticket 06: Agent Response Parsing & Structured Output

## Overview

Fix the critical JSON parsing failures in the agentic pipeline by implementing robust structured output handling with Pydantic models, improved system prompts, and retry logic. The current agent returns multiple JSON objects instead of a single structured response, causing parsing errors.

## Current State

**Critical Issues:**

- Agent returns multiple JSON objects: `{...}\n\n{...}` instead of single object
- Parsing fails with "Extra data: line 27 column 1 (char 732)" errors
- No structured output validation or retry logic
- System prompts don't enforce single JSON response format
- Manual JSON parsing without schema validation

**Error Example:**

```
{
  "thinking": true,
  "actions": [...]
}

{
  "thinking": false,
  "actions": [...]
}
```

## Target State

**Fixed Implementation:**

- Single, well-structured JSON response from agent
- Pydantic models for response validation and parsing
- Robust retry logic (3 attempts) for parsing failures
- Enhanced system prompts with explicit JSON format requirements
- Graceful error handling and fallback responses

**Expected Response Format:**

```json
{
  "thinking": false,
  "actions": [
    {
      "action": "read",
      "filePath": "app/component.tsx",
      "message": "Reading component to understand structure"
    }
  ],
  "reasoning": "Optional explanation of the approach"
}
```

## Implementation Details

### 1. Pydantic Response Models

```python
# lib/agent/models.py - Structured response models
from pydantic import BaseModel, Field, validator
from typing import List, Literal, Optional
from datetime import datetime

class AgentAction(BaseModel):
    """Individual action that the agent wants to perform"""
    action: Literal["read", "edit", "create", "delete", "search"] = Field(
        description="Type of action to perform on the file system"
    )
    filePath: str = Field(
        min_length=1,
        description="Path to the file or directory for the action"
    )
    content: Optional[str] = Field(
        default=None,
        description="Content for create/edit actions"
    )
    message: str = Field(
        min_length=1,
        description="Human-readable explanation of why this action is needed"
    )

    @validator('filePath')
    def validate_file_path(cls, v):
        """Ensure file path is valid and safe"""
        if not v or v.strip() == "":
            raise ValueError("File path cannot be empty")

        # Basic security: prevent path traversal
        if ".." in v or v.startswith("/"):
            raise ValueError("Invalid file path: path traversal not allowed")

        return v.strip()

    @validator('message')
    def validate_message(cls, v):
        """Ensure message is meaningful"""
        if not v or len(v.strip()) < 5:
            raise ValueError("Message must be at least 5 characters")
        return v.strip()

class AgentResponse(BaseModel):
    """Complete structured response from the agent"""
    thinking: bool = Field(
        default=False,
        description="Whether the agent is still thinking or ready to act"
    )
    actions: List[AgentAction] = Field(
        default_factory=list,
        description="List of actions the agent wants to perform"
    )
    reasoning: Optional[str] = Field(
        default=None,
        description="Optional explanation of the agent's reasoning"
    )

    class Config:
        """Pydantic configuration"""
        extra = "forbid"  # Reject unknown fields
        validate_assignment = True

    @validator('actions')
    def validate_actions(cls, v):
        """Ensure actions list is reasonable"""
        if len(v) > 10:
            raise ValueError("Too many actions: maximum 10 allowed")
        return v

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization"""
        return self.dict(exclude_none=True)

class AgentError(BaseModel):
    """Error response when agent fails"""
    error: str = Field(description="Error message")
    error_type: Literal["parsing", "validation", "timeout", "unknown"] = Field(
        default="unknown",
        description="Type of error that occurred"
    )
    partial_response: Optional[str] = Field(
        default=None,
        description="Any partial response that was captured before error"
    )
    timestamp: datetime = Field(default_factory=datetime.now)
```

### 2. Enhanced Response Parser with Retry Logic

````python
# lib/agent/parser.py - Robust response parsing with retry
import json
import re
import logging
from typing import Union, Optional
from pydantic import ValidationError

from .models import AgentResponse, AgentError

logger = logging.getLogger(__name__)

class AgentResponseParser:
    """Handles parsing and validation of agent responses with retry logic"""

    def __init__(self, max_retries: int = 3):
        self.max_retries = max_retries

    def parse_response(self, raw_response: str) -> Union[AgentResponse, AgentError]:
        """
        Parse agent response with retry logic and error handling

        Args:
            raw_response: Raw string response from the agent

        Returns:
            Validated AgentResponse or AgentError
        """

        for attempt in range(self.max_retries):
            try:
                logger.debug(f"Parse attempt {attempt + 1}/{self.max_retries}")

                # Clean and prepare response
                cleaned_response = self._clean_response(raw_response)

                # Extract JSON from cleaned response
                json_data = self._extract_json(cleaned_response)

                # Validate with Pydantic
                response = AgentResponse.parse_obj(json_data)

                logger.info("Successfully parsed agent response")
                return response

            except json.JSONDecodeError as e:
                logger.warning(f"JSON decode error on attempt {attempt + 1}: {e}")
                if attempt == self.max_retries - 1:
                    return AgentError(
                        error=f"Failed to parse JSON after {self.max_retries} attempts: {e}",
                        error_type="parsing",
                        partial_response=raw_response[:500] + "..." if len(raw_response) > 500 else raw_response
                    )

            except ValidationError as e:
                logger.warning(f"Validation error on attempt {attempt + 1}: {e}")
                if attempt == self.max_retries - 1:
                    return AgentError(
                        error=f"Response validation failed: {e}",
                        error_type="validation",
                        partial_response=raw_response[:500] + "..." if len(raw_response) > 500 else raw_response
                    )

            except Exception as e:
                logger.error(f"Unexpected error on attempt {attempt + 1}: {e}")
                if attempt == self.max_retries - 1:
                    return AgentError(
                        error=f"Unexpected parsing error: {e}",
                        error_type="unknown",
                        partial_response=raw_response[:500] + "..." if len(raw_response) > 500 else raw_response
                    )

        # Should never reach here, but safety fallback
        return AgentError(
            error="Parsing failed for unknown reason",
            error_type="unknown",
            partial_response=raw_response[:500] + "..." if len(raw_response) > 500 else raw_response
        )

    def _clean_response(self, response: str) -> str:
        """
        Clean the raw response to improve parsing success

        Args:
            response: Raw response string

        Returns:
            Cleaned response string
        """

        # Remove common prefixes/suffixes
        response = response.strip()

        # Remove markdown code blocks if present
        response = re.sub(r'^```json\s*', '', response, flags=re.MULTILINE)
        response = re.sub(r'^```\s*$', '', response, flags=re.MULTILINE)

        # Remove any text before the first {
        first_brace = response.find('{')
        if first_brace > 0:
            response = response[first_brace:]

        # Find the last } and truncate everything after
        last_brace = response.rfind('}')
        if last_brace > 0:
            response = response[:last_brace + 1]

        # Remove any trailing text after JSON
        lines = response.split('\n')
        json_lines = []
        in_json = False
        brace_count = 0

        for line in lines:
            if not in_json and line.strip().startswith('{'):
                in_json = True

            if in_json:
                json_lines.append(line)
                brace_count += line.count('{') - line.count('}')

                # If we've closed all braces, we're done
                if brace_count == 0:
                    break

        return '\n'.join(json_lines)

    def _extract_json(self, cleaned_response: str) -> dict:
        """
        Extract and parse JSON from cleaned response

        Args:
            cleaned_response: Pre-cleaned response string

        Returns:
            Parsed JSON dictionary

        Raises:
            json.JSONDecodeError: If JSON parsing fails
        """

        # Try direct parsing first
        try:
            return json.loads(cleaned_response)
        except json.JSONDecodeError:
            pass

        # Try to find and extract the first complete JSON object
        start = cleaned_response.find('{')
        if start == -1:
            raise json.JSONDecodeError("No opening brace found", cleaned_response, 0)

        brace_count = 0
        end = start

        for i, char in enumerate(cleaned_response[start:], start):
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1

            if brace_count == 0:
                end = i + 1
                break

        if brace_count != 0:
            raise json.JSONDecodeError("Unmatched braces", cleaned_response, start)

        json_str = cleaned_response[start:end]
        return json.loads(json_str)

# Singleton parser instance
parser = AgentResponseParser(max_retries=3)
````

### 3. Enhanced System Prompt Template

```python
# lib/agent/prompts.py - Improved system prompts for structured output
AGENT_SYSTEM_PROMPT = """
You are an expert coding assistant that helps users with their development tasks.

CRITICAL: You MUST respond with EXACTLY ONE valid JSON object. Do NOT return multiple JSON objects or any text outside the JSON.

Your response MUST follow this exact format:
{
  "thinking": false,
  "actions": [
    {
      "action": "read|edit|create|delete|search",
      "filePath": "path/to/file.ext",
      "content": "optional content for create/edit actions",
      "message": "explanation of why this action is needed"
    }
  ],
  "reasoning": "optional explanation of your approach"
}

RULES:
1. ALWAYS return exactly one JSON object
2. NEVER include multiple JSON objects in your response
3. NEVER include text before or after the JSON
4. NEVER use markdown code blocks around the JSON
5. The "thinking" field should be false when you're ready to provide actions
6. Include 1-10 actions maximum per response
7. Each action must have a clear, specific filePath
8. The message field should explain WHY the action is needed

EXAMPLE VALID RESPONSE:
{
  "thinking": false,
  "actions": [
    {
      "action": "read",
      "filePath": "app/components/Button.tsx",
      "message": "Need to examine the current Button component structure"
    },
    {
      "action": "edit",
      "filePath": "app/components/Button.tsx",
      "content": "updated component code here",
      "message": "Adding dark mode support to the Button component"
    }
  ],
  "reasoning": "Reading the current implementation first to understand the structure, then updating it with dark mode support"
}

Remember: EXACTLY ONE JSON OBJECT. No additional text, no multiple objects, no markdown formatting.
"""

def get_system_prompt() -> str:
    """Get the system prompt for the agent"""
    return AGENT_SYSTEM_PROMPT

def get_user_prompt(user_request: str, context: str = "") -> str:
    """
    Generate user prompt with context

    Args:
        user_request: The user's request/question
        context: Optional context about the current project

    Returns:
        Formatted user prompt
    """

    prompt_parts = []

    if context:
        prompt_parts.append(f"CONTEXT:\n{context}\n")

    prompt_parts.extend([
        f"USER REQUEST:\n{user_request}\n",
        "Please provide your response as a single JSON object following the required format.",
        "Focus on the specific files and actions needed to fulfill this request."
    ])

    return "\n".join(prompt_parts)
```

### 4. Agent Integration with Anthropic

```python
# lib/agent/client.py - Anthropic integration with structured output
import asyncio
import logging
from typing import Union, Optional
from anthropic import AsyncAnthropic

from .parser import parser, AgentResponse, AgentError
from .prompts import get_system_prompt, get_user_prompt

logger = logging.getLogger(__name__)

class AgentClient:
    """Handles communication with Anthropic Claude with structured output"""

    def __init__(self, api_key: str, model: str = "claude-3-5-sonnet-20241022"):
        self.client = AsyncAnthropic(api_key=api_key)
        self.model = model

    async def get_response(
        self,
        user_request: str,
        context: str = "",
        timeout: int = 60
    ) -> Union[AgentResponse, AgentError]:
        """
        Get structured response from the agent

        Args:
            user_request: User's request/question
            context: Optional context about the project
            timeout: Request timeout in seconds

        Returns:
            Validated AgentResponse or AgentError
        """

        try:
            logger.info(f"Sending request to agent: {user_request[:100]}...")

            # Prepare prompts
            system_prompt = get_system_prompt()
            user_prompt = get_user_prompt(user_request, context)

            # Make API call with timeout
            response = await asyncio.wait_for(
                self.client.messages.create(
                    model=self.model,
                    max_tokens=4000,
                    temperature=0.1,  # Low temperature for more consistent JSON
                    system=system_prompt,
                    messages=[{
                        "role": "user",
                        "content": user_prompt
                    }]
                ),
                timeout=timeout
            )

            # Extract content
            if not response.content or len(response.content) == 0:
                return AgentError(
                    error="Empty response from agent",
                    error_type="unknown"
                )

            raw_content = response.content[0].text
            logger.debug(f"Raw agent response: {raw_content[:200]}...")

            # Parse and validate response
            parsed_response = parser.parse_response(raw_content)

            if isinstance(parsed_response, AgentError):
                logger.error(f"Failed to parse agent response: {parsed_response.error}")
            else:
                logger.info(f"Successfully parsed response with {len(parsed_response.actions)} actions")

            return parsed_response

        except asyncio.TimeoutError:
            logger.error(f"Agent request timed out after {timeout} seconds")
            return AgentError(
                error=f"Request timed out after {timeout} seconds",
                error_type="timeout"
            )

        except Exception as e:
            logger.error(f"Error communicating with agent: {e}")
            return AgentError(
                error=f"Agent communication error: {str(e)}",
                error_type="unknown"
            )

# Singleton client (initialize with API key)
agent_client = None

def initialize_agent(api_key: str, model: str = "claude-3-5-sonnet-20241022"):
    """Initialize the global agent client"""
    global agent_client
    agent_client = AgentClient(api_key, model)

def get_agent_client() -> Optional[AgentClient]:
    """Get the global agent client"""
    return agent_client
```

### 5. Integration Example

```python
# main.py - Example usage
import asyncio
import os
from lib.agent.client import initialize_agent, get_agent_client
from lib.agent.models import AgentResponse, AgentError

async def main():
    # Initialize agent
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY environment variable is required")

    initialize_agent(api_key)
    client = get_agent_client()

    # Example request
    user_request = "Add a dark mode toggle to the home page"
    context = "This is a Next.js 15 app with Tailwind CSS and Shadcn UI components"

    # Get structured response
    response = await client.get_response(user_request, context)

    if isinstance(response, AgentError):
        print(f"Error: {response.error}")
        if response.partial_response:
            print(f"Partial response: {response.partial_response}")
    else:
        print(f"Success! Got {len(response.actions)} actions:")
        for i, action in enumerate(response.actions, 1):
            print(f"{i}. {action.action} {action.filePath}: {action.message}")

        if response.reasoning:
            print(f"Reasoning: {response.reasoning}")

if __name__ == "__main__":
    asyncio.run(main())
```

### 6. Testing Framework

````python
# tests/test_agent_parsing.py - Comprehensive tests
import pytest
import json
from lib.agent.parser import AgentResponseParser
from lib.agent.models import AgentResponse, AgentError

class TestAgentParsing:
    """Test suite for agent response parsing"""

    def setup_method(self):
        self.parser = AgentResponseParser(max_retries=3)

    def test_valid_single_json_response(self):
        """Test parsing valid single JSON response"""
        response = '''
        {
          "thinking": false,
          "actions": [
            {
              "action": "read",
              "filePath": "app/page.tsx",
              "message": "Need to read the current page"
            }
          ]
        }
        '''

        result = self.parser.parse_response(response)
        assert isinstance(result, AgentResponse)
        assert not result.thinking
        assert len(result.actions) == 1
        assert result.actions[0].action == "read"

    def test_multiple_json_objects_error(self):
        """Test handling of multiple JSON objects (the current bug)"""
        response = '''
        {
          "thinking": true,
          "actions": []
        }

        {
          "thinking": false,
          "actions": [
            {
              "action": "read",
              "filePath": "app/page.tsx",
              "message": "Reading page"
            }
          ]
        }
        '''

        result = self.parser.parse_response(response)
        # Should extract only the first JSON object
        assert isinstance(result, AgentResponse)
        assert result.thinking == True
        assert len(result.actions) == 0

    def test_markdown_wrapped_json(self):
        """Test handling JSON wrapped in markdown"""
        response = '''
        ```json
        {
          "thinking": false,
          "actions": [
            {
              "action": "edit",
              "filePath": "components/Button.tsx",
              "content": "export default function Button() { return <button>Click</button>; }",
              "message": "Creating Button component"
            }
          ]
        }
        ```
        '''

        result = self.parser.parse_response(response)
        assert isinstance(result, AgentResponse)
        assert len(result.actions) == 1
        assert result.actions[0].content is not None

    def test_invalid_json_error(self):
        """Test handling of completely invalid JSON"""
        response = "This is not JSON at all!"

        result = self.parser.parse_response(response)
        assert isinstance(result, AgentError)
        assert result.error_type == "parsing"

    def test_validation_error(self):
        """Test handling of JSON that doesn't match schema"""
        response = '''
        {
          "thinking": false,
          "actions": [
            {
              "action": "invalid_action",
              "filePath": "",
              "message": ""
            }
          ]
        }
        '''

        result = self.parser.parse_response(response)
        assert isinstance(result, AgentError)
        assert result.error_type == "validation"

    def test_retry_logic(self):
        """Test that retry logic is working"""
        parser = AgentResponseParser(max_retries=2)

        # This should fail parsing but succeed after cleaning
        response = '''
        Some text before JSON
        {
          "thinking": false,
          "actions": []
        }
        Some text after JSON
        '''

        result = parser.parse_response(response)
        assert isinstance(result, AgentResponse)
````

## Breaking Changes

1. **Response Format**: Agent must return single JSON object instead of multiple
2. **Error Handling**: New error types and structured error responses
3. **Dependencies**: New dependency on Pydantic for validation
4. **API Changes**: Parser returns Union[AgentResponse, AgentError] instead of raw JSON
5. **System Prompts**: Enhanced prompts require updated agent instructions

## Benefits

1. **Reliability**: 3-retry logic with robust error handling
2. **Validation**: Pydantic ensures response schema compliance
3. **Developer Experience**: Clear error messages with partial responses
4. **Performance**: Faster parsing with single JSON object requirement
5. **Maintainability**: Structured models make code easier to understand
6. **Type Safety**: Full TypeScript/Python type support

## Testing Requirements

1. **Unit Tests**: Test all parsing scenarios and edge cases
2. **Integration Tests**: Test full agent request/response cycle
3. **Error Scenarios**: Test network failures, timeouts, malformed JSON
4. **Performance Tests**: Verify parsing speed with large responses
5. **Retry Logic**: Test retry behavior under various failure conditions

## Acceptance Criteria

- [ ] Agent consistently returns single JSON object (no multiple objects)
- [ ] Pydantic models validate all agent responses
- [ ] Parser handles malformed JSON with 3-retry logic
- [ ] System prompts explicitly require single JSON format
- [ ] Error responses preserve partial content when possible
- [ ] All existing agent functionality continues to work
- [ ] Performance is equal or better than current implementation
- [ ] Comprehensive test coverage for parsing edge cases

## Estimated Effort

**Medium**: ~2-3 days

**Day 1**: Pydantic models, parser implementation, and system prompts
**Day 2**: Anthropic integration, error handling, and retry logic
**Day 3**: Testing, validation, and integration with existing system

This ticket resolves the critical JSON parsing issues and establishes a robust foundation for reliable agent communication using industry best practices with Pydantic validation and comprehensive error handling.
