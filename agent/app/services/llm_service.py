import json
import re
from typing import Any

from pydantic_ai import Agent
from pydantic_ai.models.anthropic import AnthropicModel

from app.models.actions import Action
from app.models.requests import ChatMessage
from app.utils.config import settings


class LLMService:
    """
    LLM service using PydanticAI and Claude 3.5 Sonnet

    Mirrors the TypeScript generateAICompletion function from lib/llm/api/ai.ts
    """

    def __init__(self):
        # Set the API key as environment variable for PydanticAI
        import os

        if settings.anthropic_api_key:
            os.environ["ANTHROPIC_API_KEY"] = settings.anthropic_api_key

        self.model = AnthropicModel(settings.model_name)

        # Create PydanticAI agent with system prompt and enable instrumentation
        self.agent = Agent(
            model=self.model,
            system_prompt=self._get_system_prompt(),
            instrument=True,  # Enable OpenTelemetry instrumentation for Langfuse
        )

    async def generate_completion(
        self, messages: list[ChatMessage], temperature: float | None = None, max_tokens: int | None = None
    ) -> str:
        """
        Generate a completion using Claude 3.5 Sonnet

        Mirrors the TypeScript generateAICompletion function
        """

        temperature = temperature or settings.temperature
        max_tokens = max_tokens or settings.max_tokens

        print("🤖 Using Claude 3.5 Sonnet for completion")
        print(f"📊 Request parameters: temperature={temperature}, maxTokens={max_tokens}")

        # Convert messages to the format expected by PydanticAI
        conversation = []
        user_message = ""

        for msg in messages:
            if msg.role == "system":
                continue  # System message is handled by agent's system_prompt

            if msg.role == "user":
                user_message = msg.content  # Use the latest user message
            else:
                conversation.append({"role": msg.role, "content": msg.content})

        try:
            print(f"Formatted message count: {len(conversation) + 1}")

            # Use PydanticAI agent to generate completion
            result = await self.agent.run(user_message)

            response_text = result.data if hasattr(result, "data") else str(result)

            # Log token usage if available
            if hasattr(result, "usage"):
                usage = result.usage
                print(f"📊 Token usage: {usage}")

            print(f"✅ Generated completion: {len(response_text)} characters")
            return response_text

        except Exception as e:
            print(f"❌ Error generating completion: {e}")
            raise

    async def parse_agent_response(self, response: str) -> dict[str, Any]:
        """
        Parse the agent response into thinking state and actions

        Mirrors the TypeScript parseAgentResponse function from agentPromptParser.ts
        """
        try:
            # Handle if response is an object with text property (shouldn't happen with our setup)
            response_text = response if isinstance(response, str) else str(response)

            # Clean up the response - remove markdown code blocks if present
            cleaned_response = response_text.strip()
            cleaned_response = re.sub(r"```(?:json)?[\r\n]?(.*?)[\r\n]?```", r"\1", cleaned_response, flags=re.DOTALL)
            cleaned_response = cleaned_response.strip()

            preview = cleaned_response[:200] + ("..." if len(cleaned_response) > 200 else "")
            print(f"📝 Cleaned response (preview): {preview}")

            # Default values for the result
            result = {
                "thinking": True,  # Default to thinking mode
                "actions": [],
            }

            try:
                # Parse the response as JSON
                parsed_response = json.loads(cleaned_response)
                return self._process_parsed_response(parsed_response, result)

            except json.JSONDecodeError as json_error:
                self._log_json_parse_error(json_error, cleaned_response)
                raise Exception(f"Failed to parse JSON response from LLM: {json_error!s}") from json_error

        except Exception as error:
            print(f"❌ Error parsing agent response: {error}")
            raise Exception(f"Error processing agent response: {error!s}") from error

    def _process_parsed_response(self, parsed_response: dict, result: dict) -> dict[str, Any]:
        """Process the parsed JSON response and extract thinking state and actions"""
        # Set thinking state if provided
        if isinstance(parsed_response, dict) and "thinking" in parsed_response:
            result["thinking"] = bool(parsed_response["thinking"])

        # Parse actions if provided
        if isinstance(parsed_response, dict) and "actions" in parsed_response:
            if isinstance(parsed_response["actions"], list):
                action_count = len(parsed_response["actions"])
                print(f"✅ Successfully parsed JSON: {action_count} potential actions found")

                # Validate each action and add to result
                valid_actions = self._validate_actions(parsed_response["actions"])
                result["actions"] = valid_actions
                print(f"✅ Found {len(result['actions'])} valid actions")
            else:
                print("⚠️ Response parsed as JSON but actions is not an array")
        else:
            print("⚠️ Response parsed as JSON but no actions field found")

        return result

    def _validate_actions(self, actions_data: list) -> list[Action]:
        """Validate and convert action data to Action objects"""
        valid_actions = []
        for idx, action_data in enumerate(actions_data):
            try:
                if isinstance(action_data, dict):
                    action = Action(**action_data)
                    valid_actions.append(action)
                else:
                    print(f"⚠️ Invalid action at index {idx}: not a dict")
            except Exception as e:
                print(f"⚠️ Invalid action at index {idx}: {e}")
        return valid_actions

    def _log_json_parse_error(self, json_error: json.JSONDecodeError, cleaned_response: str):
        """Log JSON parsing errors with helpful context"""
        print(f"❌ Error parsing JSON: {json_error}")

        # Show context around the error if possible
        if hasattr(json_error, "pos") and json_error.pos is not None:
            error_pos = json_error.pos
            start = max(0, error_pos - 30)
            end = min(len(cleaned_response), error_pos + 30)

            context = f"...{cleaned_response[start:error_pos]}[ERROR]{cleaned_response[error_pos:end]}..."
            print(f"⚠️ JSON error at position {error_pos}. Context around error:")
            print(f"Error context: {context}")

    def _get_system_prompt(self) -> str:
        """
        Get the system prompt for the agent

        Mirrors the NAIVE_SYSTEM_PROMPT from lib/llm/core/prompts.ts
        """
        return """You are an expert senior software engineer specializing in modern web development,
with deep expertise in TypeScript, React 19, Next.js 15 (without ./src/ directory and using the App Router),
Vercel AI SDK, Shadcn UI, Radix UI, and Tailwind CSS.

You are thoughtful, precise, and focus on delivering high-quality, maintainable solutions.

Your job is to help users modify their project based on the user requirements.

### Features availability
- As of now you can only implement frontend/client-side code. No APIs or Database changes.
  If you can't implement the user request because of this, just say so.
- You cannot add new dependencies or libraries. As of now you don't have access to the terminal
  in order to install new dependencies.

### HOW YOU SHOULD WORK - CRITICAL INSTRUCTIONS:
1. FIRST, understand what files you need to see by analyzing the directory structure provided
2. READ those files using the read tool to understand the codebase
3. ONLY AFTER gathering sufficient context, propose and implement changes
4. When implementing changes, break down complex tasks into smaller actions

### FILE READING BEST PRACTICES - EXTREMELY IMPORTANT:
1. AVOID REREADING FILES you've already examined - maintain awareness of files you've already read
2. PLAN your file reads upfront - make a list of all potentially relevant files before reading any
3. Prioritize reading STRUCTURAL files first (layouts, main pages) before component files
4. READ ALL NECESSARY FILES at once before starting to implement changes
5. If you read a UI component file (Button, Input, etc.), REMEMBER its API - don't read it again
6. Include clear REASONS why you need to read each file in your message
7. Once you've read 5-8 files, ASSESS if you have enough context to implement the changes
8. TRACK what you've learned from each file to avoid redundant reading
9. If you find yourself wanting to read the same file again, STOP and move to implementation
10. Keep track of the files you've already read to prevent infinite read loops

### AVAILABLE TOOLS - READ CAREFULLY

You have access to the following tools:

- read(filePath: string) - Read the contents of a file to understand existing code before making changes
- edit(filePath: string, content: string) - Edit a file
- create(filePath: string, content: string) - Create a new file
- delete(filePath: string) - Delete a file
- createDir(path: string) - Create a new directory
- removeDir(path: string) - Remove a directory and all its contents

### ‼️ CRITICAL: RESPONSE FORMAT ‼️

Your responses can be in one of two formats:

1. THINKING/READING MODE: When you need to examine files or think through a problem:
{
  "thinking": true,
  "actions": [
    {
      "action": "read",
      "filePath": "path/to/file.ts",
      "message": "I need to examine this file to understand its structure"
    }
  ]
}

2. EXECUTION MODE: When ready to implement changes:
{
  "thinking": false,
  "actions": [
    {
      "action": "edit",
      "filePath": "components/Button.tsx",
      "content": "import React from 'react';\\n\\nexport default () => <button>Click me</button>;",
      "message": "I need to update the Button component to add the onClick prop"
    }
  ]
}

Follow these JSON formatting rules:
1. Your ENTIRE response must be a single valid JSON object - no other text before or after.
2. Do NOT wrap your response in backticks or code blocks. Return ONLY the raw JSON.
3. Every string MUST have correctly escaped characters:
   - Use \\n for newlines (not actual newlines)
   - Use \\" for quotes inside strings (not " or \')
   - Use \\\\ for backslashes
4. Each action MUST have these properties:
   - action: "read" | "edit" | "create" | "delete" | "createDir" | "removeDir"
   - filePath: string - path to the file or directory
   - content: string - required for edit and create actions
   - message: string - IMPORTANT: Write messages in future tense starting with "I need to..."
     describing what the action will do, NOT what it has already done.
5. For edit actions, ALWAYS return the COMPLETE file content after your changes.
6. Verify your JSON is valid before returning it - invalid JSON will cause the entire request to fail.

IMPORTANT: The system can ONLY execute actions from the JSON object.
Any instructions or explanations outside the JSON will be ignored."""


# Global instance
llm_service = LLMService()
