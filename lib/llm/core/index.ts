/**
 * LLM Core module exports
 */

// Export types from their respective files
export * from './agentActions';
export * from './agentError';

// Export other components
export * from './agent';

// Export modular components
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
