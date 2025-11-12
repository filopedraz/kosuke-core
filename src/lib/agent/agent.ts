/**
 * Agent
 * Main orchestrator for the Claude Agent SDK integration
 * Manages the complete agent workflow: streaming, Git operations, and database updates
 */

import { db } from '@/lib/db/drizzle';
import { chatMessages } from '@/lib/db/schema';
import { GitOperations } from '@/lib/github/git-operations';
import { sessionManager } from '@/lib/sessions';
import type { AgentConfig, StreamEvent } from '@/lib/types/agent';
import { SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';
import { eq } from 'drizzle-orm';
import { ClaudeService } from './claude-service';
import { EventProcessor } from './event-processor';

/**
 * Agent
 * Orchestrates Claude Agent SDK with session isolation and GitHub integration
 */
export class Agent {
  private projectId: number;
  private sessionId: string;
  private assistantMessageId: number;
  private userId: string;
  private githubToken: string | null;

  private sessionPath: string;
  private claudeService: ClaudeService;
  private eventProcessor: EventProcessor;
  private gitOperations: GitOperations | null;

  constructor(config: AgentConfig) {
    this.projectId = config.projectId;
    this.sessionId = config.sessionId;
    this.assistantMessageId = config.assistantMessageId;
    this.userId = config.userId;
    this.githubToken = config.githubToken;

    // Get session-specific working directory
    this.sessionPath = sessionManager.getSessionPath(this.projectId, this.sessionId);

    // Initialize services
    this.claudeService = new ClaudeService(this.sessionPath);
    this.eventProcessor = new EventProcessor();
    this.gitOperations = this.githubToken ? new GitOperations() : null;

    console.log(`🚀 Agent initialized for project ${this.projectId}, session ${this.sessionId}`);
    console.log(`📁 Working directory: ${this.sessionPath}`);
  }

  /**
   * Run the agent and stream responses
   */
  async *run(prompt: string, remoteId?: string | null): AsyncGenerator<StreamEvent> {
    console.log(`🤖 Processing request for project ${this.projectId}, session ${this.sessionId}`);

    if (remoteId) {
      console.log(`🔄 Resuming Claude session with remoteId: ${remoteId}`);
    } else {
      console.log(`🆕 Starting new Claude session (will capture remoteId)`);
    }

    const startTime = Date.now();
    let capturedRemoteId: string | null = null;

    try {
      // Stream events from Claude Agent SDK
      const sdkMessages = this.claudeService.runAgenticQuery(prompt, remoteId);

      for await (const message of sdkMessages) {
        // Capture remoteId from result message (only if we don't already have one)
        if (!remoteId && !capturedRemoteId && message.type === 'result') {
          capturedRemoteId = (message as SDKResultMessage).session_id;
          console.log(`📝 Captured remoteId from Claude SDK: ${capturedRemoteId}`);
        }

        // Process each SDK message and yield client events
        const clientEvents = this.eventProcessor.processMessage(message);

        for await (const event of clientEvents) {
          yield event;
        }
      }

      // Finalize processing
      await this.finalizeProcessing();

      // Send completion event with captured remoteId
      yield {
        type: 'message_complete',
        remoteId: capturedRemoteId,
      };

      const duration = Date.now() - startTime;
      console.log(`⏱️ Total processing time: ${(duration / 1000).toFixed(2)}s`);
    } catch (error) {
      console.error(`❌ Error in agent workflow:`, error);
      await this.handleError(error);
      yield {
        type: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Finalize processing: commit changes and update database
   */
  private async finalizeProcessing(): Promise<void> {
    try {
      // Get accumulated data from event processor
      const blocks = this.eventProcessor.getAccumulatedBlocks();
      const content = this.eventProcessor.getAccumulatedContent();
      const tokenUsage = this.eventProcessor.getTokenUsage();

      console.log(`📊 Token usage: ${tokenUsage.totalTokens} total`);

      // Commit changes to GitHub if token is available
      let commitSha: string | null = null;
      if (this.gitOperations && this.githubToken) {
        try {
          const commit = await this.commitSessionChanges();
          commitSha = commit?.sha || null;

          if (commitSha) {
            console.log(`✅ Committed changes: ${commitSha.substring(0, 8)}`);
          } else {
            console.log(`ℹ️ No changes to commit`);
          }
        } catch (error) {
          console.error(`⚠️ Failed to commit changes (non-fatal):`, error);
          // Continue without commit
        }
      } else {
        console.log(`ℹ️ Skipping GitHub commit: no token available`);
      }

      // Update assistant message in database
      await this.updateAssistantMessage({
        content,
        blocks,
        tokenUsage,
        commitSha,
      });

      console.log(`✅ Successfully finalized processing`);
    } catch (error) {
      console.error(`❌ Error finalizing processing:`, error);
      throw error;
    }
  }

  /**
   * Commit session changes to GitHub
   */
  private async commitSessionChanges() {
    if (!this.gitOperations || !this.githubToken) {
      return null;
    }

    try {
      const commit = await this.gitOperations.commitSessionChanges({
        sessionPath: this.sessionPath,
        sessionId: this.sessionId,
        message: undefined, // Let it generate automatically
        githubToken: this.githubToken,
        userId: this.userId,
      });

      return commit;
    } catch (error) {
      console.error(`❌ Error committing session changes:`, error);
      throw error;
    }
  }

  /**
   * Update assistant message in database
   */
  private async updateAssistantMessage(data: {
    content: string;
    blocks: unknown[];
    tokenUsage: ReturnType<EventProcessor['getTokenUsage']>;
    commitSha: string | null;
  }): Promise<void> {
    try {
      await db
        .update(chatMessages)
        .set({
          content: data.content || null,
          blocks: data.blocks as Record<string, unknown>[],
          tokensInput: data.tokenUsage.inputTokens,
          tokensOutput: data.tokenUsage.outputTokens,
          contextTokens: data.tokenUsage.contextTokens,
          commitSha: data.commitSha,
        })
        .where(eq(chatMessages.id, this.assistantMessageId));

      console.log(`✅ Updated assistant message ${this.assistantMessageId} in database`);
    } catch (error) {
      console.error(`❌ Error updating assistant message:`, error);
      throw error;
    }
  }

  /**
   * Handle errors during agent execution
   */
  private async handleError(error: unknown): Promise<void> {
    try {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      // Get whatever content was accumulated before the error
      const partialBlocks = this.eventProcessor.getAccumulatedBlocks();
      const partialContent = this.eventProcessor.getAccumulatedContent();
      const tokenUsage = this.eventProcessor.getTokenUsage();

      // Add error block
      const errorBlocks = [
        ...partialBlocks,
        {
          type: 'error',
          message: errorMessage,
        },
      ];

      const errorContent = partialContent
        ? `${partialContent}\n\n**Error:** ${errorMessage}`
        : `**Error:** ${errorMessage}`;

      // Update database with error state
      await db
        .update(chatMessages)
        .set({
          content: errorContent,
          blocks: errorBlocks as Record<string, unknown>[],
          tokensInput: tokenUsage.inputTokens,
          tokensOutput: tokenUsage.outputTokens,
          contextTokens: tokenUsage.contextTokens,
        })
        .where(eq(chatMessages.id, this.assistantMessageId));

      console.log(`✅ Updated assistant message with error state`);
    } catch (dbError) {
      console.error(`❌ Failed to update database with error state:`, dbError);
    }
  }
}
