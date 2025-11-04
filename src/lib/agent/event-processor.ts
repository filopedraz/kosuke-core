/**
 * Event Processor
 * Transforms Claude Agent SDK messages into client-compatible streaming events
 * Accumulates content and blocks for database storage
 */

import type {
  ContentBlockDeltaEvent,
  ContentBlockStartEvent,
  ContentBlockStopEvent,
  MessageBlock,
  StreamEvent,
  TextState,
  ToolStartEvent,
  ToolStopEvent,
} from '@/lib/types/agent';
import { countTokens } from '@/lib/agent/token-counter';
import type {
  SDKAssistantMessage,
  SDKMessage,
  SDKUserMessage,
} from '@anthropic-ai/claude-agent-sdk';

// Typed constant for empty tool input
const EMPTY_TOOL_INPUT: Record<string, unknown> = {};

/**
 * Event Processor
 * Handles transformation of SDK events and accumulation of message data
 */
export class EventProcessor {
  private textState: TextState = {
    active: false,
    content: '',
    allBlocks: [],
  };

  private inputTokens = 0;
  private outputTokens = 0;

  constructor() {}

  /**
   * Process a single SDK message and yield client events
   */
  async *processMessage(message: SDKMessage): AsyncGenerator<StreamEvent> {
    if (this.isAssistantMessage(message)) {
      yield* this.processAssistantMessage(message);
    } else if (this.isUserMessage(message)) {
      yield* this.processUserMessage(message);
    }
    // Skip other message types (system messages, result messages, etc.)
  }

  /**
   * Get accumulated message blocks for database storage
   */
  getAccumulatedBlocks(): MessageBlock[] {
    // Finalize any active text block
    if (this.textState.active) {
      this.saveTextContent();
    }
    return this.textState.allBlocks;
  }

  /**
   * Get accumulated content as a single string
   */
  getAccumulatedContent(): string {
    return this.textState.allBlocks
      .filter(block => block.type === 'text')
      .map(block => (block as { content: string }).content)
      .join('\n');
  }

  /**
   * Get token usage statistics
   */
  getTokenUsage() {
    return {
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      contextTokens: 0, // Not tracked separately in Agent SDK
      totalTokens: this.inputTokens + this.outputTokens,
    };
  }

  /**
   * Reset processor state for new conversation
   */
  reset(): void {
    this.textState = {
      active: false,
      content: '',
      allBlocks: [],
    };
    this.inputTokens = 0;
    this.outputTokens = 0;
  }

  // ============================================
  // Private Methods
  // ============================================

  private isAssistantMessage(message: SDKMessage): message is SDKAssistantMessage {
    return 'type' in message && message.type === 'assistant';
  }

  private isUserMessage(message: SDKMessage): message is SDKUserMessage {
    return 'type' in message && message.type === 'user';
  }

  private async *processAssistantMessage(
    message: SDKAssistantMessage
  ): AsyncGenerator<StreamEvent> {
    // Access the actual message content from the SDK wrapper
    const content = message.message.content;

    if (!Array.isArray(content)) {
      return;
    }

    for (let i = 0; i < content.length; i++) {
      const block = content[i];

      if (block.type === 'text' && 'text' in block) {
        yield* this.processTextBlock(block.text);
      } else if (block.type === 'tool_use' && 'id' in block && 'name' in block) {
        yield* this.processToolUseBlock({
          id: block.id,
          name: block.name,
          input: block.input,
        });
      }
    }

    // Close any active text block at the end of the message
    if (this.textState.active) {
      yield this.createContentBlockStopEvent();
      this.saveTextContent();
    }
  }

  private async *processUserMessage(message: SDKUserMessage): AsyncGenerator<StreamEvent> {
    // Access the actual message content from the SDK wrapper
    const apiMessage = message.message;
    const content = apiMessage.content;

    if (!Array.isArray(content)) {
      return;
    }

    for (const block of content) {
      if (block.type === 'tool_result' && 'tool_use_id' in block) {
        yield* this.processToolResultBlock({
          tool_use_id: block.tool_use_id,
          content:
            typeof block.content === 'string' ? block.content : JSON.stringify(block.content),
          is_error: 'is_error' in block ? Boolean(block.is_error) : false,
        });
      }
    }
  }

  private async *processTextBlock(text: string): AsyncGenerator<StreamEvent> {
    // If no text block is active, start a new one
    if (!this.textState.active) {
      yield this.createContentBlockStartEvent();
      this.textState.active = true;
      this.textState.content = '';
    }

    // Yield text delta and accumulate content
    yield this.createContentBlockDeltaEvent(text);
    this.textState.content += text;

    // Count output tokens
    const tokens = countTokens(text);
    this.outputTokens += tokens;
  }

  private async *processToolUseBlock(block: {
    id: string;
    name: string;
    input?: unknown;
  }): AsyncGenerator<StreamEvent> {
    // End any active text block before starting a tool
    if (this.textState.active) {
      yield this.createContentBlockStopEvent();
      this.saveTextContent();
    }

    // Use empty object if input is undefined
    const toolInput = block.input ?? EMPTY_TOOL_INPUT;

    // Yield tool start event
    yield this.createToolStartEvent({ ...block, input: toolInput });

    // Store tool use block for DB
    this.textState.allBlocks.push({
      type: 'tool',
      id: block.id,
      name: block.name,
      input: toolInput,
      status: 'pending',
    });

    // Count tokens from tool input
    const inputStr = JSON.stringify(toolInput);
    const tokens = countTokens(inputStr);
    this.inputTokens += tokens;
  }

  private async *processToolResultBlock(block: {
    tool_use_id: string;
    content: unknown;
    is_error?: boolean;
  }): AsyncGenerator<StreamEvent> {
    // Yield tool stop event
    yield this.createToolStopEvent(block);

    // Update existing tool block with result
    this.updateToolBlockWithResult(block);

    // Count tokens from tool result
    const resultStr = JSON.stringify(block.content);
    const tokens = countTokens(resultStr);
    this.inputTokens += tokens;
  }

  private saveTextContent(): void {
    if (this.textState.content.trim()) {
      this.textState.allBlocks.push({
        type: 'text',
        content: this.textState.content,
      });
    }
    this.textState.active = false;
    this.textState.content = '';
  }

  private updateToolBlockWithResult(block: {
    tool_use_id: string;
    content: unknown;
    is_error?: boolean;
  }): void {
    for (const storedBlock of this.textState.allBlocks) {
      if (storedBlock.type === 'tool' && storedBlock.id === block.tool_use_id) {
        storedBlock.result = block.content;
        storedBlock.status = block.is_error ? 'error' : 'completed';
        break;
      }
    }
  }

  // ============================================
  // Event Creators
  // ============================================

  private createContentBlockStartEvent(): ContentBlockStartEvent {
    return {
      type: 'content_block_start',
      index: 0,
    };
  }

  private createContentBlockDeltaEvent(text: string): ContentBlockDeltaEvent {
    return {
      type: 'content_block_delta',
      delta_type: 'text_delta',
      text,
      index: 0,
    };
  }

  private createContentBlockStopEvent(): ContentBlockStopEvent {
    return {
      type: 'content_block_stop',
      index: 0,
    };
  }

  private createToolStartEvent(block: {
    id: string;
    name: string;
    input: unknown;
  }): ToolStartEvent {
    return {
      type: 'tool_start',
      tool_name: block.name,
      tool_input: block.input,
      tool_id: block.id,
    };
  }

  private createToolStopEvent(block: {
    tool_use_id: string;
    content: unknown;
    is_error?: boolean;
  }): ToolStopEvent {
    return {
      type: 'tool_stop',
      tool_id: block.tool_use_id,
      tool_result: block.content,
      is_error: block.is_error || false,
    };
  }
}
