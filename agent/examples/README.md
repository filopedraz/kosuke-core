# Observability Examples

This directory contains examples demonstrating how to use the Langfuse observability utilities in your own AI services and workflows.

## Available Examples

### 📊 `observability_example.py`
Comprehensive example showing:
- How to use the `@observe_agentic_workflow` decorator
- Custom trace creation for specific operations
- Adding performance scores and metrics
- Error handling and fallback behavior

## Running Examples

### Prerequisites
1. Install dependencies:
```bash
cd agent
pip install -r requirements.txt
```

2. Set up Langfuse credentials:
```bash
export LANGFUSE_PUBLIC_KEY="pk-lf-..."
export LANGFUSE_SECRET_KEY="sk-lf-..."
export LANGFUSE_HOST="https://cloud.langfuse.com"
```

### Run the Example
```bash
# From the agent directory
python -m examples.observability_example
```

### Expected Output
The example will:
1. ✅ Check if Langfuse is available
2. 🤖 Run a simulated AI workflow with tool usage
3. 📊 Create custom traces with performance metrics
4. 🎉 Display completion message with dashboard instructions

### What You'll See in Langfuse
After running the example, check your Langfuse dashboard for:

1. **Main Workflow Trace**: `custom-ai-pipeline`
   - Input: prompt and parameters
   - Tool executions: `data_analyzer` calls
   - Performance scores: completion rate, tool efficiency
   - Token usage metrics

2. **Custom Operation Trace**: `data-preprocessing`
   - Data processing pipeline
   - Quality and speed scores
   - Processing metrics and results

## Creating Your Own Instrumented Services

### Basic Pattern
```python
from app.utils.observability import observe_agentic_workflow

class MyAIService:
    @observe_agentic_workflow("my-ai-service")
    async def process(self, prompt: str, max_turns: int = 10):
        # Your AI logic here
        yield {"type": "content_block_delta", "text": "Processing..."}
```

### Advanced Usage
```python
from app.utils.observability import (
    create_custom_trace,
    add_trace_score,
    is_observability_enabled
)

# Check availability
if is_observability_enabled():
    # Create custom traces
    trace = create_custom_trace("my-operation", {"input": "data"})
    
    # Add performance metrics
    add_trace_score(trace.id, "quality", 0.95)
```

## Tips for Production Use

1. **Error Resilience**: Observability failures won't break your workflows
2. **Performance**: Minimal overhead with async operations
3. **Debugging**: Rich context for troubleshooting issues
4. **Monitoring**: Track performance trends over time
5. **Evaluation**: Custom scoring for workflow quality

## Troubleshooting

### No Traces Appearing?
1. Check your Langfuse credentials
2. Verify network connectivity to Langfuse host
3. Enable debug logging: `logger.setLevel(logging.DEBUG)`

### Missing Data in Traces?
1. Ensure your service has required attributes (`project_id`, etc.)
2. Check that events match expected format
3. Verify token usage method exists if tracking tokens

### Performance Issues?
1. Monitor Langfuse API response times
2. Consider adjusting trace frequency for high-volume workflows
3. Use async patterns to avoid blocking operations

## Next Steps

- Explore the [Langfuse Integration Documentation](../docs/langfuse-integration.md)
- Customize scoring metrics for your specific use cases
- Set up alerts and dashboards in Langfuse for production monitoring