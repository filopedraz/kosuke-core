"""
Example: Using Observability Utilities for Custom AI Services

This example demonstrates how to use the observability utilities from
app.utils.observability to instrument custom AI services and workflows.
"""
import asyncio
import time
from collections.abc import AsyncGenerator

from app.utils.observability import (
    observe_agentic_workflow,
    create_custom_trace,
    add_trace_score,
    is_observability_enabled
)


class CustomAIService:
    """Example custom AI service with observability integration"""
    
    def __init__(self, service_name: str):
        self.service_name = service_name
        self.project_id = 999  # Example project ID
        self.assistant_message_id = None
        
    @observe_agentic_workflow("custom-ai-pipeline")
    async def process_request(self, prompt: str, max_turns: int = 5) -> AsyncGenerator[dict, None]:
        """
        Example workflow that demonstrates observability integration
        
        The @observe_agentic_workflow decorator will automatically:
        - Create a Langfuse trace
        - Track token usage (if available)
        - Monitor tool executions 
        - Add performance scores
        - Handle errors gracefully
        """
        print(f"🤖 Starting {self.service_name} processing...")
        
        for turn in range(max_turns):
            # Simulate AI processing
            await asyncio.sleep(0.5)
            
            # Simulate different event types that the decorator will track
            if turn == 0:
                yield {
                    "type": "content_block_start"
                }
                
            if turn % 2 == 0:
                # Simulate tool usage
                yield {
                    "type": "tool_start",
                    "tool_name": "data_analyzer",
                    "tool_input": {"query": prompt},
                    "tool_id": f"tool_{turn}"
                }
                
                await asyncio.sleep(0.2)  # Simulate tool execution
                
                yield {
                    "type": "tool_stop", 
                    "tool_id": f"tool_{turn}",
                    "tool_result": f"Analysis result for turn {turn}",
                    "is_error": False
                }
            
            # Simulate text output
            yield {
                "type": "content_block_delta",
                "text": f"Processing step {turn + 1}: Analyzing '{prompt}'\n"
            }
            
        yield {
            "type": "content_block_stop"
        }
        
        print(f"✅ Completed {self.service_name} processing")
    
    def get_token_usage(self):
        """Mock token usage - in real implementation this would come from your AI service"""
        return {
            "input_tokens": 150,
            "output_tokens": 75,
            "total_tokens": 225,
            "context_tokens": 50
        }


async def example_with_custom_traces():
    """Example showing manual trace creation for non-decorated operations"""
    
    if not is_observability_enabled():
        print("⚠️ Langfuse observability not available - skipping custom trace example")
        return
        
    print("\n🔍 Creating custom trace example...")
    
    # Create a custom trace for a specific operation
    trace = create_custom_trace(
        name="data-preprocessing",
        input_data={
            "dataset": "customer_feedback.csv",
            "operation": "sentiment_analysis",
            "rows": 1000
        },
        tags=["data", "preprocessing", "sentiment"],
        metadata={
            "version": "2.1.0",
            "environment": "development"
        }
    )
    
    if trace:
        print(f"📊 Created custom trace: {trace.id}")
        
        # Simulate some processing
        await asyncio.sleep(1)
        
        # Add performance scores
        add_trace_score(trace.id, "data-quality", 0.92, "High quality dataset with minimal missing values")
        add_trace_score(trace.id, "processing-speed", 0.88, "Processing completed within expected timeframe")
        
        # Update trace with results
        trace.update(
            output={
                "processed_rows": 950,
                "sentiment_distribution": {"positive": 0.6, "neutral": 0.25, "negative": 0.15},
                "processing_time": 45.2,
                "success": True
            }
        )
        
        trace.end()
        print("✅ Custom trace completed")


async def main():
    """Main example function"""
    print("🚀 Observability Utilities Example")
    print("="*50)
    
    # Check if observability is available
    if is_observability_enabled():
        print("✅ Langfuse observability is active")
    else:
        print("⚠️ Langfuse observability not available (will run without tracing)")
    
    print("\n1️⃣ Testing decorated workflow...")
    
    # Create and use custom AI service
    service = CustomAIService("ExampleAI")
    
    # Run the instrumented workflow
    async for event in service.process_request("Analyze customer sentiment", max_turns=3):
        event_type = event.get("type", "unknown")
        if event_type == "content_block_delta":
            print(f"📝 Output: {event.get('text', '').strip()}")
        elif event_type == "tool_start":
            print(f"🔧 Tool started: {event.get('tool_name')}")
        elif event_type == "tool_stop":
            print(f"✅ Tool completed: {event.get('tool_result')}")
    
    print("\n2️⃣ Testing custom traces...")
    await example_with_custom_traces()
    
    print("\n🎉 Example completed! Check your Langfuse dashboard for traces.")
    print("   Look for traces tagged with 'custom-ai-pipeline' and 'data-preprocessing'")


if __name__ == "__main__":
    asyncio.run(main())