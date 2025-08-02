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
        self.agents_path = self.project_path / ".claude" / "agents"
        
        # Ensure project and agents directories exist
        self._setup_project_structure()
        
    def _setup_project_structure(self):
        """Set up the project directory structure for claude-code agents"""
        self.project_path.mkdir(parents=True, exist_ok=True)
        self.agents_path.mkdir(parents=True, exist_ok=True)
        
        # Create a basic project file structure if it doesn't exist
        if not (self.project_path / "package.json").exists():
            package_json = {
                "name": f"project-{self.project_id}",
                "version": "1.0.0",
                "description": "AI Agent Project",
                "main": "index.js",
                "scripts": {
                    "start": "node index.js"
                }
            }
            with open(self.project_path / "package.json", "w") as f:
                json.dump(package_json, f, indent=2)
    
    def create_agent(self, agent_type: str, description: str, system_prompt: str, 
                    allowed_tools: List[str] = None, when_to_use: str = None) -> Path:
        """
        Create a custom agent definition file
        
        Args:
            agent_type: Unique identifier for the agent type
            description: Human-readable description of the agent
            system_prompt: The system prompt for the agent
            allowed_tools: List of tools the agent can use
            when_to_use: Description of when this agent should be used
            
        Returns:
            Path to the created agent file
        """
        if allowed_tools is None:
            allowed_tools = ["Read", "Write", "Bash"]
            
        agent_content = f"""---
agent-type: "{agent_type}"
description: "{description}"
when-to-use: "{when_to_use or 'General purpose agent'}"
allowed-tools: {json.dumps(allowed_tools)}
---

{system_prompt}
"""
        
        agent_file = self.agents_path / f"{agent_type}.md"
        with open(agent_file, "w") as f:
            f.write(agent_content)
            
        return agent_file
    
    def setup_default_agents(self):
        """Set up default agents for common tasks"""
        
        # Code Analysis Agent
        self.create_agent(
            agent_type="code-analyzer",
            description="Analyzes code structure, quality, and provides insights",
            system_prompt="""You are a code analysis expert. You can:
- Analyze code structure and architecture
- Identify potential issues and improvements
- Provide code quality metrics
- Suggest refactoring opportunities
- Explain complex code patterns

Always provide clear, actionable feedback with specific examples.""",
            allowed_tools=["Read", "Grep", "Bash"],
            when_to_use="For code analysis, review, and quality assessment tasks"
        )
        
        # File Operations Agent
        self.create_agent(
            agent_type="file-operations",
            description="Handles file and directory operations",
            system_prompt="""You are a file operations specialist. You can:
- Create, read, modify, and delete files
- Manage directory structures
- Search for content across files
- Handle file permissions and metadata
- Organize project structures

Be careful with destructive operations and always confirm before making significant changes.""",
            allowed_tools=["Read", "Write", "Bash", "Grep"],
            when_to_use="For file management, content search, and project organization tasks"
        )
        
        # Development Assistant Agent
        self.create_agent(
            agent_type="dev-assistant",
            description="Provides development assistance and code generation",
            system_prompt="""You are a senior development assistant. You can:
- Generate high-quality code in multiple languages
- Debug issues and provide solutions
- Suggest best practices and patterns
- Help with API design and implementation
- Assist with testing strategies

Focus on maintainable, well-documented code that follows industry standards.""",
            allowed_tools=["Read", "Write", "Bash"],
            when_to_use="For development tasks, code generation, and technical problem solving"
        )
    
    async def run_agentic_query(self, prompt: str, max_turns: int = 5) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Run a query using the claude-code agentic pipeline
        
        Args:
            prompt: The user prompt/query
            max_turns: Maximum number of conversation turns
            
        Yields:
            Stream of events from the agentic pipeline
        """
        try:
            # Set up claude-code options
            options = ClaudeCodeOptions(
                cwd=str(self.project_path),
                allowed_tools=["Read", "Write", "Bash", "Grep"],
                permission_mode='acceptEdits',  # Auto-accept file edits for agents
                max_turns=max_turns
            )
            
            # Ensure default agents exist
            if not list(self.agents_path.glob("*.md")):
                self.setup_default_agents()
            
            # Stream the agentic query
            async for message in query(prompt=prompt, options=options):
                event_data = {"type": "unknown", "data": message}
                
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
                    # Handle other message types
                    yield {
                        "type": "message",
                        "message": str(message),
                        "raw_data": message
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
    
    async def query_with_specific_agent(self, prompt: str, agent_type: str) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Query using a specific agent type
        
        Args:
            prompt: The user prompt
            agent_type: The specific agent type to use
            
        Yields:
            Stream of events from the agent
        """
        agent_file = self.agents_path / f"{agent_type}.md"
        if not agent_file.exists():
            yield {
                "type": "error",
                "message": f"Agent type '{agent_type}' not found. Available agents: {[f.stem for f in self.agents_path.glob('*.md')]}"
            }
            return
        
        # Add agent-specific instruction to the prompt
        enhanced_prompt = f"""
Use the {agent_type} agent to handle this request:

{prompt}
"""
        
        async for event in self.run_agentic_query(enhanced_prompt):
            yield event
    
    def list_available_agents(self) -> List[Dict[str, Any]]:
        """
        List all available agents in the project
        
        Returns:
            List of agent information
        """
        agents = []
        for agent_file in self.agents_path.glob("*.md"):
            try:
                content = agent_file.read_text()
                # Parse YAML frontmatter
                if content.startswith("---"):
                    lines = content.split("\n")
                    frontmatter_end = -1
                    for i, line in enumerate(lines[1:], 1):
                        if line.strip() == "---":
                            frontmatter_end = i
                            break
                    
                    if frontmatter_end > 0:
                        frontmatter = "\n".join(lines[1:frontmatter_end])
                        # Simple YAML parsing for agent metadata
                        agent_info = {"file": agent_file.name}
                        for line in frontmatter.split("\n"):
                            if ":" in line:
                                key, value = line.split(":", 1)
                                agent_info[key.strip()] = value.strip().strip('"')
                        agents.append(agent_info)
            except Exception as e:
                print(f"Error reading agent file {agent_file}: {e}")
                
        return agents
    
    def get_project_context(self) -> Dict[str, Any]:
        """
        Get context information about the current project
        
        Returns:
            Project context including file structure and available agents
        """
        return {
            "project_id": self.project_id,
            "project_path": str(self.project_path),
            "agents_path": str(self.agents_path),
            "available_agents": self.list_available_agents(),
            "project_files": [str(f) for f in self.project_path.rglob("*") if f.is_file()],
        }