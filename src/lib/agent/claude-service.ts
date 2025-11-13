/**
 * Claude Service
 * Wrapper for the Claude Agent SDK
 * Handles SDK configuration, query execution, and tool management
 */

import type { AgentOptions } from '@/lib/types/agent';
import { query, type Options, type Query, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import type { MessageParam } from '@anthropic-ai/sdk/resources';
import { existsSync } from 'fs';

/**
 * Claude Service
 * Configures and runs the Claude Agent SDK with project-specific settings
 */
export class ClaudeService {
  private projectPath: string;
  private options: AgentOptions;

  constructor(projectPath: string, options: AgentOptions = {}) {
    this.projectPath = projectPath;

    this.options = {
      maxTurns: options.maxTurns || parseInt(process.env.AGENT_MAX_TURNS || '25', 10),
      permissionMode: options.permissionMode || 'acceptEdits',
      allowedTools: options.allowedTools || this.getDefaultTools(),
    };

    this.validateProjectPath();
  }

  /**
   * Run an agentic query with the Claude Agent SDK
   * Supports both string prompts and MessageParam with content blocks
   */
  async *runAgenticQuery(
    message: MessageParam | string,
    remoteId?: string | null
  ): AsyncGenerator<SDKMessage> {
    console.log('🤖 Starting Claude Agent SDK query');
    console.log(`📁 Working directory: ${this.projectPath}`);
    console.log(`⚙️ Max turns: ${this.options.maxTurns}`);
    console.log(`🔐 Permission mode: ${this.options.permissionMode}`);

    if (remoteId) {
      console.log(`🔄 Resuming session with remoteId: ${remoteId}`);
    } else {
      console.log(`🆕 Starting new session (no remoteId)`);
    }

    try {
      const sdkOptions = this.buildSDKOptions(remoteId);

      // Convert MessageParam to prompt format
      // For now, the Agent SDK's query() function accepts a string
      // We'll create an async generator that yields the message as SDKUserMessage
      const promptInput = this.convertToPrompt(message);

      const queryInstance: Query = query({
        prompt: promptInput,
        options: sdkOptions,
      });

      let messageCount = 0;
      for await (const sdkMessage of queryInstance) {
        messageCount++;
        console.log(`📨 Received message ${messageCount}: ${this.getMessageType(sdkMessage)}`);
        yield sdkMessage;
      }

      console.log(`✅ Processed ${messageCount} messages from Claude Agent SDK`);
    } catch (error) {
      console.error('❌ Error in Claude Agent SDK query:', error);
      throw new Error(
        `Claude Agent SDK error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Convert MessageParam or string to prompt format
   * The Claude Agent SDK currently accepts a string prompt
   * For MessageParam with content blocks, we convert to a prompt with embedded instructions
   */
  private convertToPrompt(message: MessageParam | string): string {
    // If it's already a string, return as-is
    if (typeof message === 'string') {
      return message;
    }

    // If it's a MessageParam, extract content blocks
    const content = message.content;

    // If content is a string, return it
    if (typeof content === 'string') {
      return content;
    }

    // If content is an array of blocks, build a structured prompt
    const blocks = content as Array<{ type: string; text?: string; source?: { url?: string } }>;
    const textBlocks: string[] = [];
    const attachments: string[] = [];

    for (const block of blocks) {
      if (block.type === 'text' && block.text) {
        textBlocks.push(block.text);
      } else if (block.type === 'image' && block.source?.url) {
        attachments.push(`Image: ${block.source.url}`);
      } else if (block.type === 'document' && block.source?.url) {
        attachments.push(`Document: ${block.source.url}`);
      }
    }

    // Combine text and attachment references
    const parts: string[] = [];
    if (textBlocks.length > 0) {
      parts.push(textBlocks.join('\n\n'));
    }
    if (attachments.length > 0) {
      parts.push('\nAttached files:\n' + attachments.join('\n'));
    }

    return parts.join('\n');
  }

  /**
   * Build SDK options from agent configuration
   */
  private buildSDKOptions(remoteId?: string | null): Options {
    // Build options object with only supported properties
    const options: Partial<Options> = {
      // Working directory
      cwd: this.projectPath,

      // Model configuration (from environment)
      model: process.env.NEXT_PUBLIC_DEFAULT_MODEL,

      // Tool settings
      allowedTools: this.options.allowedTools,

      // Conversation settings
      maxTurns: this.options.maxTurns,

      // Abort controller for cancellation
      abortController: new AbortController(),

      // Additional directories Claude can access (none by default for isolation)
      additionalDirectories: [],
    };

    // Add permission mode only if it's explicitly set
    if (this.options.permissionMode === 'acceptEdits') {
      options.permissionMode = 'acceptEdits';
    }

    // Add resume parameter if remoteId is provided
    if (remoteId) {
      options.resume = remoteId;
    }

    return options as Options;
  }

  /**
   * Get default tools available to Claude
   * These are all the tools supported by the Claude Agent SDK
   */
  private getDefaultTools(): string[] {
    return [
      'Task', // Plan and execute tasks
      'Bash', // Execute shell commands
      'Glob', // Find files by pattern
      'Grep', // Search file contents
      'LS', // List directory contents
      'Read', // Read file contents
      'Edit', // Edit files with search/replace
      'MultiEdit', // Edit multiple files
      'Write', // Write new files
      'NotebookRead', // Read Jupyter notebooks
      'NotebookEdit', // Edit Jupyter notebooks
      'WebFetch', // Fetch web content
      'WebSearch', // Search the web
      'TodoWrite', // Manage todo lists
      'ExitPlanMode', // Exit planning mode
    ];
  }

  /**
   * Validate project path exists
   */
  private validateProjectPath(): void {
    if (!existsSync(this.projectPath)) {
      throw new Error(`Project directory does not exist: ${this.projectPath}`);
    }

    console.log(`✅ Project directory validated: ${this.projectPath}`);
  }

  /**
   * Get message type for logging
   */
  private getMessageType(message: SDKMessage): string {
    if ('type' in message) {
      const messageType = message.type;

      // For assistant and user messages, show content length
      if ((messageType === 'assistant' || messageType === 'user') && 'message' in message) {
        const apiMessage = message.message as { content?: unknown[] };
        const contentLength = Array.isArray(apiMessage.content) ? apiMessage.content.length : 0;
        return `${messageType} (${contentLength} blocks)`;
      }

      // For other types, show type and subtype if available
      if ('subtype' in message) {
        return `${messageType}:${message.subtype}`;
      }

      return messageType;
    }
    return 'unknown';
  }
}
