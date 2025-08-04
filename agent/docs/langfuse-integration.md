# Langfuse Integration with claude-code-sdk

## Architecture Overview

This document explains the integration between claude-code-sdk and Langfuse observability platform using a clean decorator pattern approach.

## Why Agent-Level Instrumentation?

### 🏗️ **Better Architecture**
- **Single Responsibility**: `ClaudeCodeService` focuses purely on claude-code-sdk interface
- **Separation of Concerns**: Observability is a cross-cutting concern handled at orchestration level
- **Better Context**: Agent has full workflow context (project, user, webhooks, etc.)

### 🔧 **Implementation Pattern**
```python
@observe_agentic_workflow("claude-code-agentic-pipeline")
async def run(self, prompt: str, max_turns: int = 25) -> AsyncGenerator[dict, None]:
    # Agent workflow logic here
    pass
```

## What Gets Traced

### 📊 **Comprehensive Traces**
```
🔗 Trace: claude-code-agentic-pipeline
├── 📋 Input: prompt, max_turns, project_id, assistant_message_id
├── 📈 Usage: input/output/context tokens, cost tracking
├── 🏷️ Tags: agent, claude-code, agentic, project-{id}
├── 👤 User: project-{id} (project as user context)
├── 📅 Session: session-{assistant_message_id}
└── 📋 Metadata: model, service, project_path, start_time
    ├── 🔗 Output: response, tool_executions, total_actions, duration
    ├── 🛠️ Tool Tracking: tool_name, inputs, outputs, success/error
    └── 📊 Custom Metrics: workflow-completion, tool-usage-efficiency
```

### 🛠️ **Tool Usage Analytics**
- **Tool Execution Tracking**: Every tool call (Read, Write, Bash, etc.)
- **Success/Error Rates**: Tool-level success metrics
- **Performance Metrics**: Duration, token efficiency
- **Error Details**: Comprehensive error context

### 📈 **Custom Metrics**
- **workflow-completion**: 1.0 for success, 0.0 for failure
- **tool-usage-efficiency**: Ratio of successful to total tool executions

## Integration Benefits

### 🔍 **Observability Features**
- **Real-time Monitoring**: Track agentic workflows as they execute
- **Performance Analysis**: Identify bottlenecks in tool usage
- **Error Tracking**: Comprehensive error context and debugging
- **Cost Optimization**: Token usage patterns across projects

### 🚀 **Production Ready**
- **Zero Performance Impact**: Async, non-blocking instrumentation
- **Error Resilience**: Instrumentation failures don't affect workflows
- **Scalable**: Handles high-volume agentic workloads
- **Configurable**: Easy to enable/disable via environment variables

## Configuration

### Environment Variables
```bash
# Required for Langfuse integration
LANGFUSE_PUBLIC_KEY="pk-lf-..."
LANGFUSE_SECRET_KEY="sk-lf-..."
LANGFUSE_HOST="https://cloud.langfuse.com"

# Model configuration (used in traces)
ANTHROPIC_MODEL="claude-3-7-sonnet-20250219"
```

### Dependencies
```python
# requirements.txt
langfuse==3.38.4
opentelemetry-instrumentation-anthropic==0.1.0
```

## Design Decisions

### ✅ **Why Decorator Pattern?**
1. **Clean Separation**: Business logic separate from observability
2. **Reusable**: Can be applied to any async generator method
3. **Non-Intrusive**: Original method signature unchanged
4. **Maintainable**: Easy to modify or remove instrumentation

### ✅ **Why Agent-Level vs Service-Level?**
1. **Full Context**: Agent has project, user, and webhook context
2. **Workflow Boundaries**: Natural trace boundaries at workflow level
3. **Better UX**: Traces match user-perceived operations
4. **Easier Debugging**: Single trace per user interaction

### ✅ **Why Manual vs OpenTelemetry Auto-Instrumentation?**
- claude-code-sdk uses CLI tool, not Anthropic SDK directly
- Auto-instrumentation doesn't capture CLI-based calls
- Manual approach provides better control over trace structure
- Can capture tool usage and workflow-specific metrics

## Usage Examples

### Basic Integration
```python
# Agent automatically instruments all workflows
agent = Agent(project_id=123, assistant_message_id=456)
async for event in agent.run("Analyze this codebase"):
    # Events are automatically traced to Langfuse
    yield event
```

### Advanced Analysis in Langfuse
```python
# Query traces by project
traces = langfuse.get_traces(
    tags=["project-123", "claude-code"]
)

# Analyze tool usage patterns
for trace in traces:
    tool_executions = trace.output.get("tool_executions", [])
    success_rate = sum(1 for t in tool_executions if not t.get("is_error")) / len(tool_executions)
```

## Future Enhancements

- [ ] **User Context Integration**: Map project IDs to actual user IDs
- [ ] **Advanced Metrics**: Cost per operation, time-to-completion trends
- [ ] **A/B Testing**: Compare different system prompts or tool configurations
- [ ] **Alerting**: Set up alerts for high error rates or performance issues
- [ ] **Dashboards**: Custom dashboards for project managers and developers

## Troubleshooting

### Common Issues
1. **Missing Traces**: Check Langfuse credentials and network connectivity
2. **Incomplete Data**: Ensure decorator is applied to the correct method
3. **Performance Impact**: Monitor Langfuse API response times

### Debug Mode
```python
# Enable debug logging for Langfuse
langfuse = get_client()
langfuse.debug = True
```

## Architecture Comparison

| Approach | Pros | Cons |
|----------|------|------|
| **Agent-Level (Current)** | Clean separation, full context, workflow boundaries | Requires decorator pattern |
| **Service-Level** | Close to implementation, detailed traces | Mixed concerns, limited context |
| **OpenTelemetry Auto** | Zero code changes | Doesn't work with CLI tools |
| **Event-Level** | Maximum granularity | Performance overhead, noise |

The **Agent-Level** approach provides the best balance of observability, maintainability, and performance.