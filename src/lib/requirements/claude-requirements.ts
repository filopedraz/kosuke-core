/**
 * Claude Agent SDK Integration for Requirements Gathering
 *
 * This module handles requirements gathering conversations using Claude Agent SDK
 * to create comprehensive docs.md files before development begins.
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import * as fs from 'fs';
import * as path from 'path';

// In-memory session storage
const sessionStore = new Map<string, string>(); // projectId -> claudeSessionId
const firstRequestTracker = new Map<string, boolean>(); // projectId -> isFirstRequest

/**
 * Get or create workspace directory for a project
 */
export function getProjectWorkspace(projectId: number): string {
  const workspaceRoot = process.cwd();
  const projectWorkspace = path.join(workspaceRoot, 'projects', projectId.toString());

  // Create workspace if it doesn't exist
  if (!fs.existsSync(projectWorkspace)) {
    fs.mkdirSync(projectWorkspace, { recursive: true });
  }

  return projectWorkspace;
}

/**
 * Clean up project workspace
 */
export function cleanupProjectWorkspace(projectId: number): void {
  const projectWorkspace = getProjectWorkspace(projectId);

  if (fs.existsSync(projectWorkspace)) {
    fs.rmSync(projectWorkspace, { recursive: true, force: true });
  }

  // Clean up session tracking
  const sessionKey = projectId.toString();
  sessionStore.delete(sessionKey);
  firstRequestTracker.delete(sessionKey);
}

/**
 * Check if docs.md exists in project workspace
 */
export function docsExist(projectId: number): boolean {
  const projectWorkspace = getProjectWorkspace(projectId);
  const docsPath = path.join(projectWorkspace, 'docs.md');
  return fs.existsSync(docsPath);
}

/**
 * Read docs.md content from project workspace
 */
export function readDocs(projectId: number): string | null {
  const projectWorkspace = getProjectWorkspace(projectId);
  const docsPath = path.join(projectWorkspace, 'docs.md');

  if (!fs.existsSync(docsPath)) {
    return null;
  }

  return fs.readFileSync(docsPath, 'utf-8');
}

/**
 * Process requirements message using Claude Agent SDK
 * Returns an async generator for streaming responses
 */
export async function* processRequirementsMessage(
  projectId: number,
  userMessage: string
): AsyncGenerator<{
  type: 'user' | 'assistant' | 'result';
  content?: unknown;
  sessionId?: string;
  message?: unknown;
  subtype?: string;
  duration_ms?: number;
  usage?: unknown;
}> {
  const sessionKey = projectId.toString();
  const projectWorkspace = getProjectWorkspace(projectId);

  // Get session ID if exists
  const existingSessionId = sessionStore.get(sessionKey) || undefined;
  const isFirstRequest = !firstRequestTracker.has(sessionKey);

  // Modify prompt for first request to enforce requirements workflow
  let effectivePrompt = userMessage;

  if (isFirstRequest) {
    effectivePrompt = `${userMessage}

IMPORTANT INSTRUCTIONS FOR FIRST REQUEST:
This is a product implementation request. You MUST follow this workflow:

1. **Analyze the Request**: Understand what product needs to be built
2. **List Core Functionalities**: Present all features in clear bullet points
3. **Define Implementation Plan**: Create a detailed plan with all required components
4. **Ask NUMBERED Clarification Questions**: List any ambiguities or missing requirements with numbers

Format your response as:
---
## Product Analysis
[Brief description of what will be built]

## Core Functionalities
- [Functionality 1]
- [Functionality 2]
- [Functionality 3]
...

## Implementation Plan
[High-level technical approach and architecture]

## Clarification Questions
1. [Question 1]
2. [Question 2]
3. [Question 3]
...

---

WORKFLOW AFTER USER ANSWERS QUESTIONS:
Create a comprehensive requirements document in docs.md with:
   - Product Overview
   - Core Functionalities (detailed)
   - Technical Architecture
   - User Flows
   - Database Schema
   - API Endpoints
   - Implementation Notes

IMPORTANT: This is an INTERACTIVE conversation. After showing this plan, WAIT for the user's response. The conversation continues - do NOT stop the chat loop.`;

    firstRequestTracker.set(sessionKey, false); // Mark as not first request anymore
  }

  try {
    // Use Claude Agent SDK query function
    const result = query({
      prompt: effectivePrompt,
      options: {
        cwd: projectWorkspace,
        settingSources: ['project'],
        permissionMode: 'acceptEdits',
        resume: existingSessionId,
        allowedTools: [
          'Task',
          'Bash',
          'Glob',
          'Grep',
          'LS',
          'ExitPlanMode',
          'Read',
          'Edit',
          'MultiEdit',
          'Write',
          'NotebookRead',
          'NotebookEdit',
          'WebFetch',
          'TodoWrite',
          'WebSearch',
        ],
        systemPrompt: {
          type: 'preset',
          preset: 'claude_code',
        },
      },
    });

    // Stream messages from Claude
    for await (const message of result) {
      if (message.type === 'user') {
        // Store session ID for continuation
        if (message.session_id && !sessionStore.has(sessionKey)) {
          sessionStore.set(sessionKey, message.session_id);
        }

        yield {
          type: 'user',
          sessionId: message.session_id,
        };
      } else if (message.type === 'assistant') {
        yield {
          type: 'assistant',
          message: message.message,
          sessionId: message.session_id,
        };

        // Update session ID
        if (message.session_id) {
          sessionStore.set(sessionKey, message.session_id);
        }
      } else if (message.type === 'result') {
        yield {
          type: 'result',
          subtype: message.subtype,
          duration_ms: message.duration_ms,
          usage: message.usage,
        };
      }
    }
  } catch (error) {
    console.error('Error processing requirements message:', error);
    throw error;
  }
}

/**
 * Get the current Claude session ID for a project
 */
export function getClaudeSessionId(projectId: number): string | undefined {
  return sessionStore.get(projectId.toString());
}

/**
 * Clear Claude session for a project
 */
export function clearClaudeSession(projectId: number): void {
  const sessionKey = projectId.toString();
  sessionStore.delete(sessionKey);
  firstRequestTracker.delete(sessionKey);
}
