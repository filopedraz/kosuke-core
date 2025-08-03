# Claude Code Repository Agent

This document describes the claude-code-sdk integration for repository analysis and intelligent file modification.

## Overview

The claude-code agent provides sophisticated repository analysis and file modification capabilities:

- **Repository Analysis**: Understands existing code structure and architecture
- **Intelligent File Modification**: Makes thoughtful changes based on context
- **Tool-Aware Execution**: Automatically uses Read, Write, Bash, and Grep tools
- **Kosuke Template Integration**: Works with Next.js/React/TypeScript projects

## How Tool Execution Works

**Important**: Tool execution is handled automatically by claude-code-sdk. When Claude decides to use a tool (like Read, Write, Bash, or Grep), the SDK:

1. **Automatically executes the tool** with the parameters Claude specifies
2. **Returns the results** to Claude without any manual intervention
3. **Continues the conversation** with the tool results integrated

You don't need to implement tool execution logic - it's all handled behind the scenes by claude-code-sdk.

## Architecture

### Components

1. **ClaudeCodeService** (`app/services/claude_code_service.py`)
   - Wrapper around `claude-code-sdk`
   - Manages Kosuke template project structure
   - Handles single-agent execution

2. **ClaudeCodeAgent** (`app/core/claude_code_agent.py`)
   - Main agent class for repository analysis
   - Compatible with existing FastAPI streaming architecture
   - Provides single-agent execution capabilities

3. **Claude Code API Routes** (`app/api/routes/agentic.py`)
   - Endpoints matching existing `/chat` interface
   - Stream and simple (non-streaming) endpoints
   - Direct compatibility with Next.js frontend

### Project Structure

Projects start with Kosuke template structure:

```
/tmp/projects/{project_id}/
├── package.json          # Next.js configuration
├── app/
│   └── page.tsx          # Main page component
├── README.md             # Project documentation
└── {additional files as created by agent}
```

## API Endpoints

The API provides endpoints that match the existing chat interface for seamless Next.js integration:

### Claude Code Stream
**POST** `/api/claude-code/stream`

Streaming endpoint that matches the existing `/api/chat/stream` interface.

```json
{
  "project_id": 123,
  "prompt": "Add a contact form to the homepage",
  "assistant_message_id": 456
}
```

### Claude Code Simple
**POST** `/api/claude-code`

Non-streaming endpoint that matches the existing `/api/chat` interface.

```json
{
  "project_id": 123,
  "prompt": "Analyze the current code structure",
  "assistant_message_id": 456
}
```

### Test Endpoint
**GET** `/api/claude-code/test`

Verify the claude-code API is working properly.

## Agent Capabilities

The single agent can:

### Code Analysis
- Understand existing code structure and architecture
- Identify potential issues and improvements
- Assess code quality and suggest optimizations
- Analyze security considerations

### File Operations
- Read and understand existing files
- Create new files with appropriate content
- Modify existing files intelligently
- Organize project structure

### Development Tasks
- Generate high-quality React/TypeScript code
- Implement features following best practices
- Debug issues and provide solutions
- Add proper documentation and comments

### Bash Operations
- Run build commands and tests
- Install dependencies via npm/yarn
- Execute project-specific scripts
- Perform file system operations

## Prerequisites

### 1. Claude Code CLI Installation

```bash
npm install -g @anthropic-ai/claude-code
```

### 2. Environment Setup

```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

### 3. Python Dependencies

```bash
cd agent && pip install -r requirements.txt
```

## Usage Examples

### Basic Repository Analysis

```bash
curl -X POST "http://localhost:8000/api/claude-code/stream" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": 123,
    "prompt": "Analyze the current codebase and suggest improvements"
  }'
```

### Adding a Feature

```bash
curl -X POST "http://localhost:8000/api/claude-code/stream" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": 123, 
    "prompt": "Add a user authentication system with login and signup forms"
  }'
```

### Code Generation

```python
from app.core.claude_code_agent import ClaudeCodeAgent

agent = ClaudeCodeAgent(project_id=123)

async for event in agent.run("Create a reusable Button component with TypeScript"):
    if event["type"] == "text":
        print(event["text"])
```

## Integration with Next.js Frontend

The claude-code endpoints are designed to be drop-in replacements for the existing chat endpoints:

### Frontend Integration

Replace existing chat calls:

```typescript
// Before (regular chat)
const response = await fetch('/api/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ project_id, prompt })
});

// After (claude-code agent)
const response = await fetch('/api/claude-code/stream', {
  method: 'POST', 
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ project_id, prompt })
});
```

### Response Format

The response format is identical to existing chat endpoints:

```typescript
interface StreamEvent {
  type: "text" | "tool_start" | "error" | "message_complete";
  text?: string;
  tool_name?: string;
  tool_input?: any;
  message?: string;
}
```

## Tool Execution Details

### Available Tools

- **Read**: Read file contents, directory listings
- **Write**: Create/modify files with new content  
- **Bash**: Execute shell commands (npm install, builds, etc.)
- **Grep**: Search for patterns across files

### Automatic Execution

When Claude decides to use a tool, claude-code-sdk:

1. **Intercepts the tool call** from Claude's response
2. **Executes the tool** with the specified parameters
3. **Captures the output** (file contents, command results, etc.)
4. **Sends the results back** to Claude automatically
5. **Continues the conversation** with the tool results

### Example Tool Flow

```
User: "Add error handling to the API routes"

Claude: "I'll analyze the current API routes first"
→ claude-code-sdk automatically executes: Read("app/api/")

Claude: "I can see there are 3 API routes. Let me check each one..."
→ claude-code-sdk automatically executes: Read("app/api/users/route.ts")
→ claude-code-sdk automatically executes: Read("app/api/auth/route.ts")

Claude: "I'll add proper error handling to each route"
→ claude-code-sdk automatically executes: Write("app/api/users/route.ts", updated_content)
→ claude-code-sdk automatically executes: Write("app/api/auth/route.ts", updated_content)

Claude: "Error handling has been added. Here's what I changed..."
```

## Error Handling

### Common Issues

1. **Claude Code CLI Not Found**
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

2. **Permission Errors**
   - Check file permissions on `/tmp/projects/`
   - Ensure claude-code CLI has proper access

3. **API Key Issues**
   - Verify `ANTHROPIC_API_KEY` environment variable
   - Ensure API key has claude-code access

### Debug Mode

```bash
export ANTHROPIC_LOG=debug
```

## Performance Considerations

- **File Caching**: claude-code-sdk caches file reads for efficiency
- **Tool Optimization**: Smart tool usage to minimize unnecessary operations
- **Context Management**: Efficient handling of large codebases
- **Streaming**: Real-time responses for better user experience

## Security

- **Sandboxed Execution**: Tools run in project-specific directories
- **Permission Control**: Limited to specified project directories
- **API Key Security**: Secure handling of Anthropic credentials
- **Process Isolation**: Each project runs independently

## Migration from Regular Chat

To migrate from regular chat to claude-code agent:

1. **Change endpoint**: `/api/chat/stream` → `/api/claude-code/stream`
2. **Keep same request format**: No changes to request structure
3. **Same response format**: Existing frontend code works unchanged
4. **Enhanced capabilities**: Now includes file modification abilities

## Troubleshooting

### Debug Steps

1. **Test the endpoint**: `curl http://localhost:8000/api/claude-code/test`
2. **Check CLI installation**: `claude-code --version`
3. **Verify API key**: Echo `$ANTHROPIC_API_KEY`
4. **Check logs**: Enable debug logging for detailed output

### Common Solutions

- **Restart after CLI installation**: Ensure PATH is updated
- **Check project permissions**: Verify write access to `/tmp/projects/`
- **API rate limits**: Monitor Anthropic API usage
- **Large files**: claude-code-sdk handles large codebases efficiently

## Next Steps

The claude-code agent provides a powerful foundation for:

1. **Intelligent Code Generation**: Context-aware file creation
2. **Repository Refactoring**: Large-scale code improvements  
3. **Feature Implementation**: End-to-end feature development
4. **Code Analysis**: Comprehensive codebase understanding
5. **Project Migration**: Converting between frameworks/patterns

For questions or support, refer to the claude-code-sdk documentation or create an issue in the repository.