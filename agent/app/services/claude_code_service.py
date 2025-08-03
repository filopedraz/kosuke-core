"""
Claude Code Service - Wrapper for claude-code-sdk agentic pipeline
"""
import os
import json
import asyncio
from typing import AsyncGenerator, Dict, Any, List, Optional
from pathlib import Path

from claude_code_sdk import query, ClaudeCodeOptions, AssistantMessage, TextBlock, ToolUseBlock, ToolResultBlock
from claude_code_sdk.errors import ClaudeSDKError, CLINotFoundError, ProcessError

from app.utils.config import settings


class ClaudeCodeService:
    """
    Service for using claude-code-sdk with agentic capabilities
    
    This service provides:
    - Custom agent framework with file-based agent definitions
    - Tool use capabilities 
    - Parallel agent execution
    - Smart task routing
    """
    
    def __init__(self, project_id: int):
        self.project_id = project_id
        self.project_path = Path(f"/tmp/projects/{project_id}")
        
        # Ensure project directory exists (project is already kosuke-template structured)
        self.project_path.mkdir(parents=True, exist_ok=True)
        
    def _get_cursor_rules(self) -> str:
        """
        Fetch cursor rules from .cursor/rules/general.mdc if it exists
        """
        try:
            cursor_rules_path = self.project_path / ".cursor" / "rules" / "general.mdc"
            
            if cursor_rules_path.exists():
                rules_content = cursor_rules_path.read_text(encoding="utf-8")
                
                return f"""
================================================================
Project Guidelines & Cursor Rules
================================================================
{rules_content}
================================================================
"""
            return ""
        except Exception as e:
            print(f"Warning: Could not load cursor rules: {e}")
            return ""
    

    
    async def run_agentic_query(self, prompt: str, max_turns: int = 5) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Run a query using the claude-code agentic pipeline with a single agent
        
        Args:
            prompt: The user prompt/query
            max_turns: Maximum number of conversation turns
            
        Yields:
            Stream of events from the agentic pipeline
        """
        try:
            # Enhanced prompt with system instructions for the single agent
            base_system_prompt = """You are an expert software development assistant working on a Kosuke template project. You can:

- Analyze code structure, architecture, and quality
- Read, create, modify, and organize files and directories  
- Generate high-quality code following best practices
- Debug issues and provide solutions
- Implement features and improvements
- Work with Next.js, React, TypeScript, and modern web technologies

You have access to tools to read files, write files, run bash commands, and search through code. Tool execution is handled automatically - when you decide to use a tool like Read, Write, or Bash, it will be executed automatically and the results will be provided to you.

Be thorough in your analysis and make thoughtful, well-reasoned changes. Always explain your reasoning and provide clear documentation for any modifications."""

            # Include cursor rules if they exist
            cursor_rules = self._get_cursor_rules()
            
            # Build complete system prompt
            system_prompt_parts = [base_system_prompt]
            if cursor_rules:
                system_prompt_parts.append(cursor_rules)
            
            system_prompt = "\n\n".join(system_prompt_parts)
            
            # Set up claude-code options
            options = ClaudeCodeOptions(
                cwd=str(self.project_path),
                allowed_tools=["Read", "Write", "Bash", "Grep"],
                permission_mode='acceptEdits',  # Auto-accept file edits
                max_turns=max_turns,
                system_prompt=system_prompt
            )
            
            # Stream the agentic query
            async for message in query(prompt=prompt, options=options):
                if isinstance(message, AssistantMessage):
                    # Process assistant message content
                    for block in message.content:
                        if isinstance(block, TextBlock):
                            yield {
                                "type": "text", 
                                "text": block.text,
                                "message_id": message.id
                            }
                        elif isinstance(block, ToolUseBlock):
                            yield {
                                "type": "tool_start",
                                "tool_name": block.name,
                                "tool_input": block.input,
                                "tool_id": block.id
                            }
                else:
                    # Handle other message types (tool results, etc)
                    yield {
                        "type": "message",
                        "message": str(message)
                    }
                    
        except CLINotFoundError:
            yield {
                "type": "error",
                "message": "Claude Code CLI not found. Please install: npm install -g @anthropic-ai/claude-code"
            }
        except ProcessError as e:
            yield {
                "type": "error", 
                "message": f"Process failed with exit code {e.exit_code}: {e}"
            }
        except ClaudeSDKError as e:
            yield {
                "type": "error",
                "message": f"Claude SDK error: {e}"
            }
        except Exception as e:
            yield {
                "type": "error",
                "message": f"Unexpected error in agentic pipeline: {e}"
            }
    

    
    def get_project_context(self) -> Dict[str, Any]:
        """
        Get context information about the current project
        
        Returns:
            Project context including file structure
        """
        return {
            "project_id": self.project_id,
            "project_path": str(self.project_path),
            "project_files": [str(f) for f in self.project_path.rglob("*") if f.is_file()],
        }