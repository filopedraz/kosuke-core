/**
 * Claude Service
 * Wrapper for the Claude Agent SDK
 * Handles SDK configuration, query execution, and tool management
 */

import type { AgentOptions } from '@/lib/types/agent';
import { query, type Options, type Query, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';
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
   */
  async *runAgenticQuery(prompt: string): AsyncGenerator<SDKMessage> {
    console.log('🤖 Starting Claude Agent SDK query');
    console.log(`📁 Working directory: ${this.projectPath}`);
    console.log(`⚙️ Max turns: ${this.options.maxTurns}`);
    console.log(`🔐 Permission mode: ${this.options.permissionMode}`);

    try {
      const sdkOptions = this.buildSDKOptions();
      const queryInstance: Query = query({
        prompt,
        options: sdkOptions,
      });

      let messageCount = 0;
      for await (const message of queryInstance) {
        messageCount++;
        console.log(`📨 Received message ${messageCount}: ${this.getMessageType(message)}`);
        yield message;
      }

      console.log(`✅ Processed ${messageCount} messages from Claude Agent SDK`);
    } catch (error) {
      console.error('❌ Error in Claude Agent SDK query:', error);
      throw new Error(`Claude Agent SDK error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build SDK options from agent configuration
   */
  private buildSDKOptions(): Options {
    // Build options object with only supported properties
    const options: Partial<Options> = {
      // Working directory
      cwd: this.projectPath,

      // Model configuration (from environment)
      model: process.env.ANTHROPIC_MODEL,

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

    return options as Options;
  }

  /**
   * Get default tools available to Claude
   * These are all the tools supported by the Claude Agent SDK
   */
  private getDefaultTools(): string[] {
    return [
      'Task',           // Plan and execute tasks
      'Bash',           // Execute shell commands
      'Glob',           // Find files by pattern
      'Grep',           // Search file contents
      'LS',             // List directory contents
      'Read',           // Read file contents
      'Edit',           // Edit files with search/replace
      'MultiEdit',      // Edit multiple files
      'Write',          // Write new files
      'NotebookRead',   // Read Jupyter notebooks
      'NotebookEdit',   // Edit Jupyter notebooks
      'WebFetch',       // Fetch web content
      'WebSearch',      // Search the web
      'TodoWrite',      // Manage todo lists
      'ExitPlanMode',   // Exit planning mode
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

