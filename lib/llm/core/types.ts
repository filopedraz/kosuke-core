/**
 * Type definitions for the LLM core module
 */

import { z } from 'zod';

/**
 * Action types
 */
export type ActionType =
  | 'readFile'
  | 'editFile'
  | 'createFile'
  | 'deleteFile'
  | 'createDirectory'
  | 'removeDirectory'
  | 'search';

/**
 * Agent error types for better error handling
 */
export type AgentErrorType = 'timeout' | 'parsing' | 'processing' | 'unknown';

export interface AgentError {
  type: AgentErrorType;
  message: string;
  details?: string;
}

/**
 * Action interface
 */
export interface Action {
  action: ActionType;
  filePath: string;
  content?: string;
  match?: string;
  message: string;
}

/**
 * Schemas for validation
 */
export const actionSchema = z.object({
  action: z.enum([
    'readFile',
    'editFile',
    'createFile',
    'deleteFile',
    'createDirectory',
    'removeDirectory',
    'search',
  ]),
  filePath: z.string(),
  content: z.string().optional(),
  match: z.string().optional(),
  message: z.string(),
});

/**
 * Helper functions
 */
export function normalizeAction(action: Action): Action {
  // Return a normalized copy of the action
  return {
    action: action.action,
    filePath: normalizePath(action.filePath),
    content: action.content,
    match: action.match,
    message: action.message || '',
  };
}

export function normalizePath(path: string): string {
  // Remove leading and trailing whitespace
  path = path.trim();

  // Remove leading slashes
  if (path.startsWith('/')) {
    path = path.substring(1);
  }

  // Remove any instances of './' at the beginning
  if (path.startsWith('./')) {
    path = path.substring(2);
  }

  return path;
}

/**
 * Validate an action object to ensure it has all required fields
 * @param action The action object to validate
 * @returns Boolean indicating if the action is valid
 */
export function isValidAction(action: unknown): action is Action {
  if (typeof action !== 'object' || action === null) {
    return false;
  }

  const typedAction = action as Partial<Action>;

  // Check required fields
  if (typeof typedAction.action !== 'string' || typeof typedAction.filePath !== 'string') {
    return false;
  }

  // Check action types
  const validActions: string[] = [
    'readFile',
    'editFile',
    'createFile',
    'deleteFile',
    'createDirectory',
    'removeDirectory',
    'search',
  ];

  if (!validActions.includes(typedAction.action)) {
    return false;
  }

  // Check content requirement for edit and create actions
  if (
    (typedAction.action === 'editFile' || typedAction.action === 'createFile') &&
    typeof typedAction.content !== 'string'
  ) {
    return false;
  }

  return true;
}

/**
 * Action execution result type - updated to include error information
 */
export interface ActionExecutionResult {
  success: boolean;
  error?: string;
  errorType?: AgentErrorType;
  errorDetails?: string;
  actions?: Action[];
}
