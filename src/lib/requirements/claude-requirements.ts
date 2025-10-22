/**
 * Claude Streaming Integration for Requirements Gathering
 *
 * This module handles requirements gathering conversations using Claude Agent SDK
 * with token-by-token streaming to create comprehensive docs.md files.
 */

import { query, type Options } from '@anthropic-ai/claude-agent-sdk';
import * as fs from 'fs';
import * as path from 'path';

// In-memory session storage
interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

const conversationHistory = new Map<string, ConversationMessage[]>(); // projectId -> conversation
const firstRequestTracker = new Map<string, boolean>(); // projectId -> isFirstRequest
const sessionIds = new Map<string, string>(); // projectId -> sessionId for resuming

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
  conversationHistory.delete(sessionKey);
  firstRequestTracker.delete(sessionKey);
  sessionIds.delete(sessionKey);
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
 * Build system prompt for requirements gathering
 */
function buildSystemPrompt(): string {
  return `You are a product requirements expert helping to define a comprehensive project specification.

Your goal is to create a detailed requirements document that will guide development.

CRITICAL: The file MUST be named exactly "docs.md" - no other filename is acceptable.

You MUST immediately use the Write tool to create a file named "docs.md" (not any other name) with the following comprehensive content:
- Product Overview
- Core Functionalities (detailed)
- Technical Architecture
- User Flows
- Database Schema
- API Endpoints
- Implementation Notes

IMPORTANT: Always use the Write tool with path "docs.md" - never use any other filename like "project-specs.md" or "{project-name}-specs.md". The filename must always be exactly "docs.md".

You have access to Read and Write tools for file operations.

/*
COMMENTED OUT - Two-step clarification flow (for later use):

On the FIRST request, you MUST:
1. Analyze what the user wants to build
2. List all core functionalities as bullet points
3. Define a high-level implementation plan
4. Ask numbered clarification questions about ambiguities

After the user answers your questions, create a comprehensive docs.md file.
*/`;
}

/**
 * Process requirements message with streaming
 * Returns an async generator for token-by-token streaming using Claude Agent SDK
 */
export async function* processRequirementsMessage(
  projectId: number,
  userMessage: string
): AsyncGenerator<{
  type: 'text_delta' | 'tool_use' | 'tool_result' | 'complete' | 'thinking_delta';
  text?: string;
  thinking?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolResult?: string;
  usage?: Record<string, unknown>;
}> {
  const sessionKey = projectId.toString();
  const projectWorkspace = getProjectWorkspace(projectId);

  // Get or initialize conversation history
  const messages = conversationHistory.get(sessionKey) || [];
  const isFirstRequest = !firstRequestTracker.has(sessionKey);

  // Modify first request prompt
  let effectiveMessage = userMessage;
  if (isFirstRequest) {
    effectiveMessage = `${userMessage}

IMPORTANT: Please immediately use the Write tool to create a file named exactly "docs.md" (not any other filename) with comprehensive specifications based on this request. Make reasonable assumptions where details are unclear.

Remember: The filename must be "docs.md" - do not use any other name.`;

    /*
    COMMENTED OUT - Two-step clarification flow (for later use):

    effectiveMessage = \`\${userMessage}

Please analyze this request and provide:
1. Product Analysis
2. Core Functionalities (bullet points)
3. Implementation Plan
4. Numbered Clarification Questions

After I answer your questions, create a comprehensive docs.md file.\`;
    */

    firstRequestTracker.set(sessionKey, false);
  }

  try {
    // Configure Claude Agent SDK options
    const options: Options = {
      model: process.env.ANTHROPIC_MODEL || 'sonnet',
      cwd: projectWorkspace,
      systemPrompt: buildSystemPrompt(),
      allowedTools: ['Read', 'Write'], // Only file operations for requirements
      maxTurns: 5, // Limit conversation turns
      includePartialMessages: true, // Enable streaming events
      permissionMode: 'acceptEdits', // Auto-accept file writes
      resume: sessionIds.get(sessionKey), // Resume previous session if exists
    };

    // Stream from Claude Agent SDK
    let assistantResponse = '';
    let completionUsage: Record<string, unknown> = {};
    let currentSessionId = '';

    const queryStream = query({ prompt: effectiveMessage, options });

    for await (const message of queryStream) {
      // Handle different message types from Claude Agent SDK
      if (message.type === 'stream_event') {
        // Streaming events for real-time updates
        const event = message.event;

        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            // Text streaming
            const text = event.delta.text;
            assistantResponse += text;
            yield {
              type: 'text_delta',
              text,
            };
          }
        } else if (event.type === 'content_block_start') {
          if (event.content_block.type === 'tool_use') {
            // Tool use started
            yield {
              type: 'tool_use',
              toolName: event.content_block.name,
              toolInput: {},
            };
          }
        }
      } else if (message.type === 'assistant') {
        // Full assistant message (for non-streaming or final message)
        const content = message.message.content;
        for (const block of content) {
          if (block.type === 'text') {
            assistantResponse += block.text;
          }
        }

        // Capture session ID for resuming
        currentSessionId = message.session_id;
      } else if (message.type === 'result') {
        // Final result with usage statistics
        if (message.usage) {
          completionUsage = {
            inputTokens: message.usage.input_tokens,
            outputTokens: message.usage.output_tokens,
          };
        }

        // Save session ID for future resumption
        if (currentSessionId) {
          sessionIds.set(sessionKey, currentSessionId);
        }
      } else if (message.type === 'system') {
        // System initialization message
        if (message.subtype === 'init') {
          currentSessionId = message.session_id;
        }
      }
    }

    // Update conversation history
    messages.push(
      { role: 'user', content: effectiveMessage },
      { role: 'assistant', content: assistantResponse }
    );
    conversationHistory.set(sessionKey, messages);

    // Yield completion
    yield {
      type: 'complete',
      usage: completionUsage,
    };
  } catch (error) {
    console.error('Error in Claude Agent SDK streaming:', error);
    throw error;
  }
}

/**
 * Get conversation history for a project
 */
export function getConversationHistory(projectId: number): ConversationMessage[] | undefined {
  return conversationHistory.get(projectId.toString());
}

/**
 * Clear conversation history for a project
 */
export function clearConversationHistory(projectId: number): void {
  const sessionKey = projectId.toString();
  conversationHistory.delete(sessionKey);
  firstRequestTracker.delete(sessionKey);
  sessionIds.delete(sessionKey);
}
