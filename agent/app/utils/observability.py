"""
Observability utilities for Langfuse integration

This module provides decorators and utilities for comprehensive observability
of agentic workflows, including claude-code-sdk integrations.
"""
import logging
import time
from collections.abc import AsyncGenerator
from collections.abc import Callable
from functools import wraps
from typing import Any

from .config import get_langfuse_client

logger = logging.getLogger(__name__)

langfuse = get_langfuse_client()


def _create_generation(operation_name: str, self, prompt: str, max_turns: int):
    """Create a Langfuse generation for the workflow."""
    if not langfuse:
        return None

    try:
        generation = langfuse.start_generation(
            name=operation_name,
            input={
                "prompt": prompt,
                "max_turns": max_turns,
                "project_id": getattr(self, "project_id", None),
                "assistant_message_id": getattr(self, "assistant_message_id", None),
            },
            metadata={
                "service": "claude-code-sdk",
                "operation": operation_name,
                "project_path": (
                    str(getattr(self.claude_code_service, "project_path", ""))
                    if hasattr(self, "claude_code_service")
                    else ""
                ),
                "start_time": time.time(),
            },
            model="claude-3-7-sonnet-20250219",
            level="DEFAULT",
        )

        _update_trace_metadata(operation_name, self)
        logger.info(f"🔍 Started Langfuse generation: {operation_name}")
        return generation

    except AttributeError as e:
        logger.warning(f"⚠️ Langfuse API error: {e}. Continuing without observability.")
        return None
    except Exception as e:
        logger.warning(f"⚠️ Failed to create Langfuse generation, continuing without observability: {e}")
        return None


def _update_trace_metadata(operation_name: str, self):
    """Update the current trace with metadata."""
    try:
        langfuse.update_current_trace(
            name=operation_name,
            tags=["agent", "claude-code", "agentic", f"project-{getattr(self, 'project_id', 'unknown')}"],
            user_id=(f"project-{getattr(self, 'project_id', 'unknown')}" if hasattr(self, "project_id") else None),
            session_id=(
                f"session-{getattr(self, 'assistant_message_id', 'unknown')}"
                if hasattr(self, "assistant_message_id")
                else None
            ),
        )
    except Exception as e:
        logger.debug(f"Failed to update trace metadata: {e}")


def _process_event(
    event: dict[str, Any], collected_output: list[str], tool_executions: list[dict[str, Any]]
) -> tuple[bool, str | None]:
    """Process a single event and update tracking data."""
    error_occurred = False
    error_details = None

    event_type = event.get("type")

    if event_type == "content_block_delta":
        collected_output.append(event.get("text", ""))
    elif event_type == "tool_start":
        tool_executions.append(
            {
                "tool_name": event.get("tool_name"),
                "tool_input": event.get("tool_input", {}),
                "tool_id": event.get("tool_id"),
                "status": "started",
                "timestamp": time.time(),
            }
        )
    elif event_type == "tool_stop":
        _update_tool_execution(event, tool_executions)
    elif event_type == "error":
        error_occurred = True
        error_details = event.get("message", "Unknown error")

    return error_occurred, error_details


def _update_tool_execution(event: dict[str, Any], tool_executions: list[dict[str, Any]]):
    """Update tool execution with completion data."""
    tool_id = event.get("tool_id")
    for tool in tool_executions:
        if tool.get("tool_id") == tool_id:
            tool.update(
                {
                    "tool_result": event.get("tool_result", ""),
                    "is_error": event.get("is_error", False),
                    "status": "completed",
                    "duration": time.time() - tool.get("timestamp", time.time()),
                }
            )
            break


def _get_token_usage(self) -> dict[str, int]:
    """Get token usage from the service."""
    if not hasattr(self, "claude_code_service"):
        return {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0, "context_tokens": 0}

    try:
        return self.claude_code_service.get_token_usage()
    except Exception as e:
        logger.debug(f"Could not get token usage: {e}")
        return {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0, "context_tokens": 0}


def _calculate_workflow_metrics(tool_executions: list[dict[str, Any]]) -> dict[str, Any]:
    """Calculate workflow metrics from tool executions."""
    successful_tools = [t for t in tool_executions if not t.get("is_error", False)]
    failed_tools = [t for t in tool_executions if t.get("is_error", False)]

    avg_duration = 0
    if tool_executions:
        total_duration = sum(t.get("duration", 0) for t in tool_executions)
        avg_duration = total_duration / len(tool_executions)

    return {
        "tool_count": len(tool_executions),
        "successful_tools": len(successful_tools),
        "failed_tools": len(failed_tools),
        "avg_tool_duration": avg_duration,
    }


def _update_generation_success(
    generation,
    collected_output: list[str],
    tool_executions: list[dict[str, Any]],
    self,
    workflow_duration: float,
    error_occurred: bool,
    error_details: str | None,
    token_usage: dict[str, int],
):
    """Update generation with successful completion data."""
    try:
        generation.update(
            output={
                "response": "".join(collected_output),
                "tool_executions": tool_executions,
                "total_actions": getattr(self, "total_actions", len(tool_executions)),
                "duration": workflow_duration,
                "success": not error_occurred,
                "error_details": error_details if error_occurred else None,
                "tools_used": list({t.get("tool_name") for t in tool_executions}),
                "workflow_metrics": _calculate_workflow_metrics(tool_executions),
            },
            usage_details={
                "input_tokens": token_usage.get("input_tokens", 0),
                "output_tokens": token_usage.get("output_tokens", 0),
                "total_tokens": token_usage.get("total_tokens", 0),
            },
            level="ERROR" if error_occurred else "DEFAULT",
        )
    except AttributeError as e:
        logger.warning(f"⚠️ Langfuse API error when updating generation: {e}")
    except Exception as e:
        logger.warning(f"⚠️ Failed to update Langfuse generation: {e}")


def _update_generation_error(
    generation,
    error_message: str,
    collected_output: list[str],
    tool_executions: list[dict[str, Any]],
    workflow_start_time: float,
):
    """Update generation with error information."""
    try:
        generation.update(
            output={
                "error": error_message,
                "error_type": type(Exception).__name__,
                "partial_output": "".join(collected_output),
                "tool_executions": tool_executions,
                "duration": time.time() - workflow_start_time,
            },
            level="ERROR",
        )
        _add_error_score(error_message)
    except AttributeError as e:
        logger.warning(f"⚠️ Langfuse API error when updating error generation: {e}")
    except Exception as e:
        logger.warning(f"⚠️ Failed to update generation with error info: {e}")


def _add_error_score(error_message: str):
    """Add error score to the workflow."""
    try:
        langfuse.create_score(
            name="workflow-completion",
            value=0.0,
            comment=f"Workflow failed with error: {error_message}",
        )
    except AttributeError as e:
        logger.warning(f"⚠️ Langfuse API error when adding error score: {e}")


def _end_generation(generation, operation_name: str):
    """End the Langfuse generation."""
    try:
        generation.end()
        logger.debug(f"🏁 Ended Langfuse generation: {operation_name}")
    except AttributeError as e:
        logger.warning(f"⚠️ Langfuse API error when ending generation: {e}")
    except Exception as e:
        logger.warning(f"⚠️ Failed to end generation: {e}")


class _WorkflowTracker:
    """Helper class to track workflow execution state."""

    def __init__(self):
        self.error_occurred = False
        self.error_details = None


async def _execute_workflow_with_tracking(
    func,
    self,
    prompt: str,
    max_turns: int,
    kwargs: dict,
    generation,
    collected_output: list[str],
    tool_executions: list[dict[str, Any]],
    tracker: _WorkflowTracker,
):
    """Execute the workflow function and track events."""
    async for event in func(self, prompt, max_turns, **kwargs):
        # Process event for tracking if generation is available
        if generation:
            event_error, event_error_details = _process_event(event, collected_output, tool_executions)
            if event_error:
                tracker.error_occurred = True
                tracker.error_details = event_error_details

        # Always yield the event to maintain streaming behavior
        yield event


def _finalize_successful_workflow(
    generation,
    collected_output: list[str],
    tool_executions: list[dict[str, Any]],
    self,
    workflow_duration: float,
    error_occurred: bool,
    error_details: str | None,
    token_usage: dict[str, int],
    operation_name: str,
):
    """Finalize a successful workflow with logging and scoring."""
    if generation:
        _update_generation_success(
            generation,
            collected_output,
            tool_executions,
            self,
            workflow_duration,
            error_occurred,
            error_details,
            token_usage,
        )
        _add_workflow_scores(generation, tool_executions, error_occurred, workflow_duration)
        logger.info(f"✅ Completed Langfuse generation: {operation_name} " f"(Duration: {workflow_duration:.2f}s)")
    else:
        logger.debug(
            f"✅ Completed workflow without observability: {operation_name} " f"(Duration: {workflow_duration:.2f}s)"
        )


def _handle_workflow_error(
    generation,
    error: Exception,
    collected_output: list[str],
    tool_executions: list[dict[str, Any]],
    workflow_start_time: float,
    operation_name: str,
):
    """Handle workflow errors with proper logging and generation updates."""
    error_message = str(error)
    logger.error(f"❌ Error in instrumented workflow {operation_name}: {error_message}")

    if generation:
        _update_generation_error(generation, error_message, collected_output, tool_executions, workflow_start_time)


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

            # Initialize tracking variables
            generation = _create_generation(operation_name, self, prompt, max_turns)
            collected_output = []
            tool_executions = []
            tracker = _WorkflowTracker()
            workflow_start_time = time.time()

            try:
                # Execute workflow with event tracking
                async for event in _execute_workflow_with_tracking(
                    func, self, prompt, max_turns, kwargs, generation, collected_output, tool_executions, tracker
                ):
                    yield event

                # Finalize successful workflow
                workflow_duration = time.time() - workflow_start_time
                token_usage = _get_token_usage(self)

                _finalize_successful_workflow(
                    generation,
                    collected_output,
                    tool_executions,
                    self,
                    workflow_duration,
                    tracker.error_occurred,
                    tracker.error_details,
                    token_usage,
                    operation_name,
                )

            except Exception as e:
                _handle_workflow_error(
                    generation, e, collected_output, tool_executions, workflow_start_time, operation_name
                )
                raise
            finally:
                if generation:
                    _end_generation(generation, operation_name)

        return wrapper

    return decorator


def _create_completion_score(error_occurred: bool, tool_executions: list[dict[str, Any]]):
    """Create workflow completion score."""
    try:
        langfuse.create_score(
            name="workflow-completion",
            value=1.0 if not error_occurred else 0.0,
            comment=f"Workflow completed with {len(tool_executions)} tool executions",
        )
    except AttributeError as e:
        logger.warning(f"⚠️ Langfuse API error when adding completion score: {e}")
        return False
    return True


def _create_efficiency_score(tool_executions: list[dict[str, Any]]):
    """Create tool usage efficiency score."""
    if not tool_executions:
        return

    successful_tools = len([t for t in tool_executions if not t.get("is_error", False)])
    efficiency_score = successful_tools / len(tool_executions)

    try:
        langfuse.create_score(
            name="tool-usage-efficiency",
            value=efficiency_score,
            comment=f"Tool success rate: {successful_tools}/{len(tool_executions)} ({efficiency_score:.1%})",
        )
    except AttributeError as e:
        logger.warning(f"⚠️ Langfuse API error when adding efficiency score: {e}")


def _calculate_performance_score(duration: float) -> float:
    """Calculate performance score based on duration."""
    if duration < 30:  # Fast
        return 1.0
    if duration < 60:  # Moderate
        return 0.8
    if duration < 120:  # Slow
        return 0.6
    # Very slow
    return 0.4


def _create_performance_score(duration: float):
    """Create workflow performance score."""
    if duration <= 0:
        return

    performance_score = _calculate_performance_score(duration)

    try:
        langfuse.create_score(
            name="workflow-performance",
            value=performance_score,
            comment=f"Workflow duration: {duration:.2f}s",
        )
    except AttributeError as e:
        logger.warning(f"⚠️ Langfuse API error when adding performance score: {e}")


def _add_workflow_scores(generation, tool_executions: list[dict[str, Any]], error_occurred: bool, duration: float):
    """Add custom scoring metrics for workflow evaluation"""
    if not generation or not langfuse:
        return

    try:
        # Create completion score - if this fails, skip other scores
        if not _create_completion_score(error_occurred, tool_executions):
            return

        # Create efficiency score if we have tool executions
        _create_efficiency_score(tool_executions)

        # Create performance score if duration is valid
        _create_performance_score(duration)

    except Exception as e:
        logger.warning(f"⚠️ Failed to add workflow scores: {e}")


def create_custom_generation(name: str, input_data: dict, **kwargs):
    """
    Create a custom Langfuse generation for non-decorated operations

    Args:
        name: Generation name
        input_data: Input data for the generation
        **kwargs: Additional generation parameters (metadata, model, etc.)

    Returns:
        Langfuse generation object or None if unavailable
    """
    if not langfuse:
        logger.debug("🔍 Langfuse not available, skipping custom generation creation")
        return None

    try:
        return langfuse.start_generation(name=name, input=input_data, **kwargs)
    except AttributeError as e:
        logger.warning(f"⚠️ Langfuse API error: {e}. Continuing without observability.")
        return None
    except Exception as e:
        logger.warning(f"⚠️ Failed to create custom generation: {e}")
        return None


def add_score(name: str, value: float, comment: str = ""):
    """
    Add a score to the current trace/generation

    Args:
        name: Score name/metric
        value: Score value (typically 0.0 to 1.0)
        comment: Optional comment explaining the score
    """
    if not langfuse:
        logger.debug("🔍 Langfuse not available, skipping score addition")
        return

    try:
        langfuse.create_score(name=name, value=value, comment=comment)
        logger.debug(f"📊 Added score '{name}': {value}")
    except AttributeError as e:
        logger.warning(f"⚠️ Langfuse API error when adding score: {e}")
    except Exception as e:
        logger.warning(f"⚠️ Failed to add score: {e}")


def is_observability_enabled() -> bool:
    """Check if Langfuse observability is enabled and available"""
    return langfuse is not None
