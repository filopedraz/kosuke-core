# Native Tool Execution Migration

## Overview

Migrate from the current **manual tool execution** pattern to **native PydanticAI tool execution** for improved conversation flow and reduced code complexity.

## Current Implementation (Manual Execution)

### How it Works

1. LLM generates structured response with action list
2. We manually iterate through actions
3. We call tools ourselves in Python code
4. Tools execute outside the LLM conversation flow

### Current Flow

```python
# 1. Get structured response from LLM
result = await agent.run_stream(prompt, deps=project_id)
final_result = await result.result()

# 2. WE manually execute each action
for action in final_result.data.actions:
    ctx = self._create_context()
    if action.operation == "read":
        await read_file(ctx, action.file_path)  # We call this
    elif action.operation == "edit":
        await edit_file(ctx, action.file_path, action.content)  # We call this
```

### Benefits of Current Approach

- ✅ **Full Control**: We decide exactly when and how tools are executed
- ✅ **Predictable**: Always follows the same action → execution pattern
- ✅ **Debugging**: Easier to debug because we control the flow
- ✅ **Batch Operations**: Can optimize/batch multiple operations
- ✅ **Custom Logic**: Can add validation/preprocessing before tool execution

## Proposed Implementation (Native Execution)

### How it Would Work

1. LLM directly calls tools during conversation
2. PydanticAI automatically handles tool invocation
3. Tools are part of the conversation flow
4. Framework manages the request/response cycle

### Native Flow

```python
# LLM calls tools directly during conversation
async with agent.run_stream(prompt, deps=project_id) as response:
    async for message in response.stream_text():
        print(message)  # Shows: "I need to read the file first..."
        # Behind the scenes: LLM calls read_file(ctx, "app.tsx")
        # Tool result goes back to LLM automatically
        # LLM continues: "Now I'll update the file..."
        # Behind the scenes: LLM calls edit_file(ctx, "app.tsx", "new content")

# Get final result - all tools already executed
final_result = await response.result()
```

## Benefits of Native Execution

### 🚀 **Improved User Experience**

- **Natural Conversation**: LLM can reason about tool results and adjust approach
- **Real-time Updates**: Users see tool calls happening in real-time
- **Adaptive Behavior**: LLM can decide to use different tools based on results
- **Error Recovery**: LLM can handle tool errors and retry with different approaches

### 🧹 **Reduced Code Complexity**

- **Less Code**: Framework handles tool orchestration automatically
- **No Manual Mapping**: No need for operation → function mapping
- **Automatic Context**: RunContext handled by framework
- **Built-in Streaming**: Tool calls streamed automatically

### 🎯 **Modern AI Patterns**

- **Industry Standard**: Follows latest AI framework best practices
- **Framework Native**: Uses PydanticAI as intended
- **Better Abstractions**: Leverages framework's tool system fully

## Implementation Changes Required

### 1. Remove Manual Execution Logic

**Current Code to Remove:**

```python
async def _execute_structured_actions(self, actions: list[FileOperation]):
    """Execute structured actions from Pydantic AI response"""
    for action in actions:
        ctx = self._create_context()
        if action.operation == "read":
            await read_file(ctx, action.file_path)
        # ... etc
```

### 2. Update Agent Run Method

**From (Current):**

```python
async def run(self, prompt: str) -> AsyncGenerator[dict, None]:
    async with self.agent.run_stream(prompt, deps=self.project_id) as response:
        async for message in response.stream_text():
            yield {"type": "text", "message": message}

        final_result = await response.result()
        # Manual execution of structured actions
        async for update in self._execute_structured_actions(final_result.data.actions):
            yield update
```

**To (Native):**

```python
async def run(self, prompt: str) -> AsyncGenerator[dict, None]:
    async with self.agent.run_stream(prompt, deps=self.project_id) as response:
        async for message in response.stream_text():
            yield {"type": "text", "message": message}
            # Tools are called automatically during this loop
            # No manual execution needed!

    final_result = await response.result()
    # final_result contains the final answer, all tools already executed
```

### 3. Remove Structured Response Model

**Current (Not Needed):**

```python
class AgentResponse(BaseModel):
    actions: list[FileOperation] = Field(default_factory=list)
    reasoning: str = Field(default="")
    complete: bool = Field(default=True)
```

**Native (Simple):**

```python
# Just return text - tools called during conversation
result_type = str  # Or a simple completion model
```

### 4. Update System Prompt

**Remove Structured Output Instructions:**

```python
# Remove these from system prompt:
### RESPONSE STRUCTURE:
Your responses will be automatically structured with:
- thinking: Your reasoning process
- actions: List of file operations to perform
- reasoning: Why these actions were chosen
- complete: Whether the task is finished
```

**Focus on Natural Tool Usage:**

```python
### TOOLS:
You have access to file operation tools. Use them naturally during your conversation
to read, edit, create, and delete files as needed to help the user.
```

## Migration Strategy

### Phase 1: Preparation

1. **Create Feature Branch**: `feature/native-tool-execution`
2. **Update Dependencies**: Ensure latest PydanticAI version
3. **Add Feature Flag**: Allow switching between manual/native modes

### Phase 2: Implementation

1. **Simplify Agent Class**: Remove manual execution logic
2. **Update Tool Registration**: Ensure tools work with native execution
3. **Modify System Prompts**: Remove structured output requirements
4. **Update Streaming Logic**: Handle native tool calls in stream

### Phase 3: Testing

1. **Unit Tests**: Test tool calls work natively
2. **Integration Tests**: Test full conversation flows
3. **Performance Testing**: Compare response times
4. **User Testing**: Verify improved user experience

### Phase 4: Deployment

1. **Gradual Rollout**: Feature flag for selective enablement
2. **Monitor Performance**: Track tool execution success rates
3. **Gather Feedback**: User experience improvements
4. **Full Migration**: Remove old manual execution code

## Considerations & Trade-offs

### ⚠️ **Potential Challenges**

1. **Less Control**:

   - Can't intercept tool calls for custom validation
   - Tool execution order determined by LLM, not us

2. **Error Handling**:

   - Need to rely on PydanticAI's error handling
   - May need custom retry logic within tools

3. **Batching Loss**:

   - Can't batch multiple file operations
   - Each tool call is independent

4. **Debugging Complexity**:
   - Tool calls happen within framework
   - May be harder to debug tool execution issues

### ✅ **Mitigation Strategies**

1. **Tool-Level Validation**:

   ```python
   async def edit_file(ctx: RunContext[int], file_path: str, content: str) -> str:
       # Add validation logic within tools
       if not is_valid_file_path(file_path):
           raise ValueError(f"Invalid file path: {file_path}")
   ```

2. **Comprehensive Logging**:

   ```python
   async def read_file(ctx: RunContext[int], file_path: str) -> str:
       logger.info(f"Tool called: read_file({file_path})")
       try:
           result = await fs_service.read_file(file_path)
           logger.info(f"Tool success: read_file({file_path})")
           return result
       except Exception as e:
           logger.error(f"Tool error: read_file({file_path}): {e}")
           raise
   ```

3. **Error-Resilient Tools**:
   ```python
   async def edit_file(ctx: RunContext[int], file_path: str, content: str) -> str:
       try:
           await fs_service.update_file(file_path, content)
           return f"Successfully edited {file_path}"
       except Exception as e:
           # Provide helpful error message for LLM to understand
           return f"Failed to edit {file_path}: {e}. Please check the file path and try again."
   ```

## Success Metrics

### 📊 **Quantitative Metrics**

- **Code Reduction**: Lines of code removed from manual execution
- **Response Time**: Average time from prompt to completion
- **Error Rate**: Tool execution failure percentage
- **User Satisfaction**: Survey scores on conversation quality

### 📈 **Qualitative Metrics**

- **Conversation Flow**: More natural back-and-forth interactions
- **Error Recovery**: Better handling of tool failures
- **Developer Experience**: Easier to add new tools
- **Maintainability**: Reduced complexity in agent logic

## References

- [PydanticAI Tools Documentation](https://ai.pydantic.dev/tools/)
- [Native vs Manual Tool Execution Analysis](../agent-improvements.md)
- [Dyad Implementation Reference](dyad-implementation.md#agentic-coding-pipeline)

## Priority

**Priority**: Medium (Future Enhancement)
**Effort**: Large (Major architectural change)
**Impact**: High (Improved UX and code maintainability)

## Next Steps

1. **Research Phase**: Study PydanticAI native tool patterns in detail
2. **Proof of Concept**: Create minimal working example with native tools
3. **Architecture Review**: Team discussion on approach and trade-offs
4. **Implementation Planning**: Detailed technical specification
5. **Development**: Execute migration in phases with feature flags

---

**Note**: This migration should be considered after current manual execution is stable and well-tested. The current approach works well for a coding agent where predictable execution order is important.
