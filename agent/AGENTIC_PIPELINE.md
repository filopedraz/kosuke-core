# Claude Code Agentic Pipeline

This document describes the new agentic pipeline integration using the `claude-code-sdk` for advanced multi-agent workflows.

## Overview

The agentic pipeline provides sophisticated AI agent capabilities beyond simple chat interactions:

- **Multi-agent collaboration**: Multiple specialized agents working together
- **Intelligent task routing**: Automatic selection of appropriate agents for tasks
- **File-based agent definitions**: Custom agents defined in Markdown files
- **Tool-aware execution**: Agents can use tools and understand their capabilities
- **Parallel processing**: Multiple agents can work simultaneously

## Architecture

### Components

1. **ClaudeCodeService** (`app/services/claude_code_service.py`)
   - Wrapper around `claude-code-sdk`
   - Manages project structure and agent definitions
   - Handles agent discovery and execution

2. **ClaudeCodeAgent** (`app/core/claude_code_agent.py`)
   - Main agent class for agentic workflows
   - Compatible with existing FastAPI streaming architecture
   - Provides agent management and execution capabilities

3. **Agentic API Routes** (`app/api/routes/agentic.py`)
   - New endpoints for agentic workflows
   - Agent management (list, create)
   - Specialized endpoints for common tasks

### Agent Structure

Agents are defined as Markdown files with YAML frontmatter:

```markdown
---
agent-type: "code-analyzer"
description: "Analyzes code structure and quality"
when-to-use: "For code analysis and review tasks"
allowed-tools: ["Read", "Grep", "Bash"]
---

You are a code analysis expert. You can:
- Analyze code structure and architecture
- Identify potential issues and improvements
- Provide code quality metrics

Always provide clear, actionable feedback.
```

## API Endpoints

### Agentic Chat Stream
**POST** `/api/agentic/chat/stream`

Stream agentic responses with multi-agent collaboration.

```json
{
  "project_id": 123,
  "prompt": "Analyze the authentication system",
  "agent_type": "code-analyzer",  // Optional: specific agent
  "max_turns": 5,
  "assistant_message_id": 456
}
```

### List Available Agents
**POST** `/api/agentic/agents/list`

Get information about all available agents for a project.

```json
{
  "project_id": 123
}
```

### Create Custom Agent
**POST** `/api/agentic/agents/create`

Create a new custom agent with specific capabilities.

```json
{
  "project_id": 123,
  "agent_type": "security-auditor",
  "description": "Performs security audits and vulnerability assessments",
  "system_prompt": "You are a security expert...",
  "allowed_tools": ["Read", "Grep", "Bash"],
  "when_to_use": "For security analysis and vulnerability scanning"
}
```

### Specialized Endpoints

#### Code Analysis
**POST** `/api/agentic/code-analysis`

Automatic code analysis using the `code-analyzer` agent.

#### Development Assistant  
**POST** `/api/agentic/dev-assistant`

Development assistance using the `dev-assistant` agent.

## Default Agents

The system includes three default agents:

### 1. Code Analyzer (`code-analyzer`)
- **Purpose**: Code analysis, review, and quality assessment
- **Tools**: Read, Grep, Bash
- **Use Cases**: 
  - Code structure analysis
  - Quality metrics and improvements
  - Security considerations
  - Performance optimization

### 2. File Operations (`file-operations`)
- **Purpose**: File and directory management
- **Tools**: Read, Write, Bash, Grep
- **Use Cases**:
  - File management and organization
  - Content searching across files
  - Project structure management
  - File metadata handling

### 3. Development Assistant (`dev-assistant`)
- **Purpose**: Development assistance and code generation
- **Tools**: Read, Write, Bash
- **Use Cases**:
  - Code generation in multiple languages
  - Debugging and issue resolution
  - Best practices and patterns
  - API design and implementation

## Prerequisites

### 1. Claude Code CLI Installation

The `claude-code-sdk` requires the Claude Code CLI to be installed:

```bash
npm install -g @anthropic-ai/claude-code
```

### 2. Environment Setup

Ensure the `ANTHROPIC_API_KEY` environment variable is set:

```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

### 3. Dependencies

Install the required Python dependencies:

```bash
pip install -r requirements.txt
```

## Project Structure

The agentic pipeline creates the following directory structure for each project:

```
/tmp/projects/{project_id}/
├── .claude/
│   └── agents/
│       ├── code-analyzer.md
│       ├── file-operations.md
│       ├── dev-assistant.md
│       └── {custom-agents}.md
├── package.json
└── {project files}
```

## Usage Examples

### Basic Agentic Query

```python
from app.core.claude_code_agent import ClaudeCodeAgent

agent = ClaudeCodeAgent(project_id=123)

async for event in agent.run("Analyze the security of this codebase"):
    if event["type"] == "text":
        print(event["text"])
```

### Using Specific Agent

```python
async for event in agent.run(
    prompt="Review the authentication module",
    agent_type="code-analyzer",
    max_turns=3
):
    # Process events
    pass
```

### Creating Custom Agent

```python
agent_file = agent.claude_code_service.create_agent(
    agent_type="api-designer",
    description="Designs and reviews API specifications",
    system_prompt="You are an API design expert...",
    allowed_tools=["Read", "Write"],
    when_to_use="For API design and specification tasks"
)
```

## Integration with Existing System

The agentic pipeline integrates seamlessly with the existing FastAPI architecture:

1. **Streaming Compatible**: Uses the same Server-Sent Events streaming as existing endpoints
2. **Webhook Integration**: Sends completion webhooks to Next.js frontend
3. **Project Isolation**: Each project has its own agent configuration
4. **Tool Compatibility**: Works with existing tool infrastructure

## Error Handling

The system handles various error conditions:

- **CLI Not Found**: Provides clear installation instructions
- **Process Errors**: Reports exit codes and error details  
- **SDK Errors**: Handles claude-code-sdk specific errors
- **Agent Errors**: Graceful handling of agent-specific failures

## Performance Considerations

- **Parallel Execution**: Agents can run in parallel (up to 10 concurrent)
- **Tool Optimization**: Efficient tool use and caching
- **Memory Management**: Isolated agent execution prevents memory leaks
- **Token Efficiency**: Smart context management and tool usage

## Security

- **Tool Permissions**: Fine-grained control over agent tool access
- **Project Isolation**: Each project has isolated agent environment
- **Sandboxed Execution**: Agents run in controlled environments
- **Permission Validation**: Tools are validated before execution

## Monitoring and Debugging

- **Structured Logging**: Comprehensive logging for debugging
- **Event Streaming**: Real-time visibility into agent operations
- **Webhook Integration**: Status updates sent to frontend
- **Error Reporting**: Detailed error information for troubleshooting

## Migration from Existing Agent

The new agentic pipeline can be used alongside the existing agent system:

- **Backward Compatibility**: Existing `/api/chat/*` endpoints remain unchanged
- **Gradual Migration**: Can migrate specific use cases to agentic endpoints
- **Feature Parity**: Maintains all existing functionality
- **Performance Benefits**: Enhanced capabilities through multi-agent collaboration

## Future Enhancements

Planned improvements include:

1. **Agent Marketplace**: Sharing and discovering community agents
2. **Visual Workflow Builder**: GUI for creating agent workflows
3. **Advanced Routing**: More sophisticated task-to-agent routing
4. **Enterprise Features**: Enhanced security and compliance tools
5. **Custom Tool Integration**: Support for project-specific tools

## Troubleshooting

### Common Issues

1. **Claude Code CLI Not Found**
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

2. **Permission Errors**
   - Check file permissions on `/tmp/projects/`
   - Ensure proper tool permissions in agent definitions

3. **API Key Issues**
   - Verify `ANTHROPIC_API_KEY` environment variable
   - Check API key has proper permissions

4. **Agent Not Found**
   - Verify agent file exists in `.claude/agents/`
   - Check agent file format and YAML frontmatter

### Debug Mode

Enable debug logging:

```bash
export ANTHROPIC_LOG=debug
```

This provides detailed information about API calls and agent execution.

## Contributing

To contribute new agents or improvements:

1. Create agent definitions following the Markdown + YAML format
2. Test agents thoroughly with various prompts
3. Ensure proper tool permissions and security
4. Document agent capabilities and use cases
5. Submit pull request with comprehensive tests

For questions or support, please refer to the main project documentation or create an issue in the repository.