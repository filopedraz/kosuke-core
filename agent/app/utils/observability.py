"""
Observability utilities for Langfuse integration

This module provides decorators and utilities for comprehensive observability
of agentic workflows, including claude-code-sdk integrations.
"""
import time
from collections.abc import AsyncGenerator
from functools import wraps
from typing import Any, Callable
import logging

from langfuse import get_client

logger = logging.getLogger(__name__)

# Get Langfuse client instance
try:
    langfuse = get_client()
except Exception as e:
    logger.warning(f"⚠️ Failed to initialize Langfuse client: {e}")
    langfuse = None


def observe_agentic_workflow(operation_name: str):
    """
    Decorator for observing agentic workflows with Langfuse
    
    This provides comprehensive tracing for AI agentic operations including:
    - Full workflow traces with input/output
    - Token usage tracking  
    - Error handling and monitoring
    - Performance metrics
    - Tool usage analytics
    - Custom scoring and evaluation
    
    Args:
        operation_name: Name for the trace operation (e.g., "claude-code-agentic-pipeline")
        
    Returns:
        Decorator function that wraps async generator methods
        
    Example:
        @observe_agentic_workflow("my-agentic-workflow")
        async def run_workflow(self, prompt: str) -> AsyncGenerator[dict, None]:
            # Your workflow logic here
            yield {"type": "result", "data": "..."}
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(self, prompt: str, max_turns: int = 25, **kwargs) -> AsyncGenerator[dict, None]:
            # Skip instrumentation if Langfuse is not available
            if not langfuse:
                logger.debug("🔍 Langfuse not available, skipping instrumentation")
                async for event in func(self, prompt, max_turns, **kwargs):
                    yield event
                return

            # Create comprehensive trace for the agentic workflow
            trace = langfuse.trace(
                name=operation_name,
                input={
                    "prompt": prompt,
                    "max_turns": max_turns,
                    "project_id": getattr(self, 'project_id', None),
                    "assistant_message_id": getattr(self, 'assistant_message_id', None),
                },
                metadata={
                    "service": "claude-code-sdk",
                    "model": "claude-3-7-sonnet-20250219",  # Based on config
                    "project_path": str(getattr(self.claude_code_service, 'project_path', '')) if hasattr(self, 'claude_code_service') else '',
                    "start_time": time.time(),
                    "operation": operation_name,
                },
                tags=[
                    "agent", 
                    "claude-code", 
                    "agentic", 
                    f"project-{getattr(self, 'project_id', 'unknown')}"
                ],
                user_id=f"project-{getattr(self, 'project_id', 'unknown')}" if hasattr(self, 'project_id') else None,
                session_id=f"session-{getattr(self, 'assistant_message_id', 'unknown')}" if hasattr(self, 'assistant_message_id') else None,
            )

            logger.info(f"🔍 Started Langfuse trace: {operation_name} (ID: {trace.id})")

            # Track accumulated data for final trace update
            collected_output = []
            tool_executions = []
            error_occurred = False
            error_details = None
            workflow_start_time = time.time()

            try:
                # Execute the original function and collect data
                async for event in func(self, prompt, max_turns, **kwargs):
                    # Collect output for tracing
                    if event.get("type") == "content_block_delta":
                        collected_output.append(event.get("text", ""))
                    elif event.get("type") == "tool_start":
                        tool_executions.append({
                            "tool_name": event.get("tool_name"),
                            "tool_input": event.get("tool_input", {}),
                            "tool_id": event.get("tool_id"),
                            "status": "started",
                            "timestamp": time.time()
                        })
                    elif event.get("type") == "tool_stop":
                        # Update tool execution with result
                        tool_id = event.get("tool_id")
                        for tool in tool_executions:
                            if tool.get("tool_id") == tool_id:
                                tool.update({
                                    "tool_result": event.get("tool_result", ""),
                                    "is_error": event.get("is_error", False),
                                    "status": "completed",
                                    "duration": time.time() - tool.get("timestamp", time.time())
                                })
                                break
                    elif event.get("type") == "error":
                        error_occurred = True
                        error_details = event.get("message", "Unknown error")

                    # Yield the event to maintain streaming behavior
                    yield event

                # Get final token usage from service if available
                token_usage = {}
                if hasattr(self, 'claude_code_service'):
                    try:
                        token_usage = self.claude_code_service.get_token_usage()
                    except Exception as e:
                        logger.debug(f"Could not get token usage: {e}")
                        token_usage = {
                            "input_tokens": 0,
                            "output_tokens": 0, 
                            "total_tokens": 0,
                            "context_tokens": 0
                        }

                workflow_duration = time.time() - workflow_start_time

                # Update trace with comprehensive final data
                trace.update(
                    output={
                        "response": "".join(collected_output),
                        "tool_executions": tool_executions,
                        "total_actions": getattr(self, 'total_actions', len(tool_executions)),
                        "duration": workflow_duration,
                        "success": not error_occurred,
                        "error_details": error_details if error_occurred else None,
                        "tools_used": list(set(t.get("tool_name") for t in tool_executions)),
                        "workflow_metrics": {
                            "tool_count": len(tool_executions),
                            "successful_tools": len([t for t in tool_executions if not t.get("is_error", False)]),
                            "failed_tools": len([t for t in tool_executions if t.get("is_error", False)]),
                            "avg_tool_duration": sum(t.get("duration", 0) for t in tool_executions) / len(tool_executions) if tool_executions else 0
                        }
                    },
                    usage={
                        "input_tokens": token_usage.get("input_tokens", 0),
                        "output_tokens": token_usage.get("output_tokens", 0), 
                        "total_tokens": token_usage.get("total_tokens", 0),
                        "context_tokens": token_usage.get("context_tokens", 0),
                    },
                    level="ERROR" if error_occurred else "DEFAULT",
                )

                # Add custom metrics for agentic workflows
                _add_workflow_scores(trace, tool_executions, error_occurred, workflow_duration)

                logger.info(f"✅ Completed Langfuse trace: {operation_name} (Duration: {workflow_duration:.2f}s)")

            except Exception as e:
                error_message = str(e)
                logger.error(f"❌ Error in instrumented workflow {operation_name}: {error_message}")
                
                # Handle any unexpected errors
                trace.update(
                    output={
                        "error": error_message,
                        "error_type": type(e).__name__,
                        "partial_output": "".join(collected_output),
                        "tool_executions": tool_executions,
                        "duration": time.time() - workflow_start_time,
                    },
                    level="ERROR"
                )
                
                # Add error score
                langfuse.score(
                    trace_id=trace.id,
                    name="workflow-completion",
                    value=0.0,
                    comment=f"Workflow failed with error: {error_message}"
                )
                
                raise
            finally:
                # Always end the trace
                try:
                    trace.end()
                    logger.debug(f"🏁 Ended Langfuse trace: {operation_name}")
                except Exception as e:
                    logger.warning(f"⚠️ Failed to end trace: {e}")

        return wrapper
    return decorator


def _add_workflow_scores(trace, tool_executions: list, error_occurred: bool, duration: float):
    """Add custom scoring metrics for workflow evaluation"""
    try:
        # Workflow completion score
        langfuse.score(
            trace_id=trace.id,
            name="workflow-completion",
            value=1.0 if not error_occurred else 0.0,
            comment=f"Workflow completed with {len(tool_executions)} tool executions"
        )

        # Tool usage efficiency score
        if tool_executions:
            successful_tools = len([t for t in tool_executions if not t.get("is_error", False)])
            efficiency_score = successful_tools / len(tool_executions)
            
            langfuse.score(
                trace_id=trace.id,
                name="tool-usage-efficiency",
                value=efficiency_score,
                comment=f"Tool success rate: {successful_tools}/{len(tool_executions)} ({efficiency_score:.1%})"
            )

        # Performance score (based on duration - you can adjust thresholds)
        if duration > 0:
            # Score decreases as duration increases (adjust thresholds as needed)
            if duration < 30:  # Fast
                performance_score = 1.0
            elif duration < 60:  # Moderate
                performance_score = 0.8
            elif duration < 120:  # Slow
                performance_score = 0.6
            else:  # Very slow
                performance_score = 0.4
                
            langfuse.score(
                trace_id=trace.id,
                name="workflow-performance",
                value=performance_score,
                comment=f"Workflow duration: {duration:.2f}s"
            )

    except Exception as e:
        logger.warning(f"⚠️ Failed to add workflow scores: {e}")


def create_custom_trace(name: str, input_data: dict, **kwargs):
    """
    Create a custom Langfuse trace for non-decorated operations
    
    Args:
        name: Trace name
        input_data: Input data for the trace
        **kwargs: Additional trace parameters (metadata, tags, etc.)
        
    Returns:
        Langfuse trace object or None if unavailable
    """
    if not langfuse:
        logger.debug("🔍 Langfuse not available, skipping custom trace creation")
        return None
        
    try:
        return langfuse.trace(name=name, input=input_data, **kwargs)
    except Exception as e:
        logger.warning(f"⚠️ Failed to create custom trace: {e}")
        return None


def add_trace_score(trace_id: str, name: str, value: float, comment: str = ""):
    """
    Add a score to an existing trace
    
    Args:
        trace_id: ID of the trace to score
        name: Score name/metric
        value: Score value (typically 0.0 to 1.0)
        comment: Optional comment explaining the score
    """
    if not langfuse:
        logger.debug("🔍 Langfuse not available, skipping score addition")
        return
        
    try:
        langfuse.score(
            trace_id=trace_id,
            name=name,
            value=value,
            comment=comment
        )
        logger.debug(f"📊 Added score '{name}': {value} to trace {trace_id}")
    except Exception as e:
        logger.warning(f"⚠️ Failed to add score to trace: {e}")


def is_observability_enabled() -> bool:
    """Check if Langfuse observability is enabled and available"""
    return langfuse is not None