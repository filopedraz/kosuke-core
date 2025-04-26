/**
 * LLM Core module exports
 */

// Export types
export * from './types';

// Export Agent class
export { Agent } from './agent';

// Export modular components
export { AgentError, classifyError, getErrorMessage } from './agentError';

export {
  generateChangesSummary,
  fetchChatHistory,
  sendOperationUpdate,
  tryRevalidatePath,
  mapOperationTypeForDb,
  mapActionToOperationType,
  updateActionStatus,
  updateMessageContent,
} from './agentCommunication';

export type { OperationType } from './agentCommunication';

export {
  executeAction,
  executeActions,
  executeToolAction,
  executeReadActionsForContext,
  updateContext,
  updateContextWithTracking,
} from './agentActions';

export {
  parseAgentResponse,
  generateAndParseAgentResponse,
  forceExecutionMode,
  logJsonParseError,
} from './agentPromptParser';

// Also export the prompts module
export * from './prompts';
