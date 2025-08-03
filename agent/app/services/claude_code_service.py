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
        
        # Ensure project structure exists with kosuke-template
        self._setup_project_structure()
        
    def _setup_project_structure(self):
        """Set up the project directory structure starting from kosuke-template"""
        self.project_path.mkdir(parents=True, exist_ok=True)
        
        # If project doesn't exist yet, we'll let claude-code-sdk work in the empty directory
        # The agent will analyze whatever files are present or create new ones as needed
        if not (self.project_path / "package.json").exists():
            # Create a minimal kosuke-template structure
            package_json = {
                "name": f"kosuke-project-{self.project_id}",
                "version": "1.0.0",
                "description": "Kosuke Template Project",
                "main": "app/page.tsx",
                "scripts": {
                    "dev": "next dev",
                    "build": "next build",
                    "start": "next start",
                    "lint": "next lint"
                },
                "dependencies": {
                    "next": "15.x",
                    "react": "19.x",
                    "react-dom": "19.x",
                    "@types/node": "^20",
                    "@types/react": "^18",
                    "@types/react-dom": "^18",
                    "typescript": "^5"
                }
            }
            with open(self.project_path / "package.json", "w") as f:
                json.dump(package_json, f, indent=2)
                
            # Create basic Next.js structure
            (self.project_path / "app").mkdir(exist_ok=True)
            (self.project_path / "app" / "page.tsx").write_text("""export default function Home() {
  return (
    <main>
      <h1>Kosuke Template Project</h1>
      <p>This is a template project that can be modified by the AI agent.</p>
    </main>
  );
}
""")
            
            # Create README
            (self.project_path / "README.md").write_text(f"""# Kosuke Project {self.project_id}

This project was initialized from the Kosuke template and can be modified by the AI agent.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the project.
""")
    

    
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
            system_prompt = """You are an expert software development assistant working on a Kosuke template project. You can:

- Analyze code structure, architecture, and quality
- Read, create, modify, and organize files and directories  
- Generate high-quality code following best practices
- Debug issues and provide solutions
- Implement features and improvements
- Work with Next.js, React, TypeScript, and modern web technologies

You have access to tools to read files, write files, run bash commands, and search through code. Tool execution is handled automatically - when you decide to use a tool like Read, Write, or Bash, it will be executed automatically and the results will be provided to you.

Be thorough in your analysis and make thoughtful, well-reasoned changes. Always explain your reasoning and provide clear documentation for any modifications."""

            enhanced_prompt = f"{system_prompt}\n\nUser Request: {prompt}"
            
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