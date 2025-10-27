/**
 * Event Processor Tests
 */

import { EventProcessor } from '@/lib/agent/event-processor';
import type { SDKAssistantMessage, SDKUserMessage } from '@anthropic-ai/claude-agent-sdk';
import { UUID } from 'crypto';

describe('EventProcessor', () => {
  let processor: EventProcessor;

  beforeEach(() => {
    processor = new EventProcessor();
  });

  describe('processMessage', () => {
    it('should process assistant text message', async () => {
      const message: SDKAssistantMessage = {
        type: 'assistant',
        uuid: 'test-uuid-1' as UUID,
        session_id: 'test-session',
        parent_tool_use_id: null,
        message: {
          content: [
            {
              type: 'text',
              text: 'Hello, how can I help you?',
            },
          ],
        },
      };

      const events = [];
      for await (const event of processor.processMessage(message)) {
        events.push(event);
      }

      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e.type === 'content_block_start')).toBe(true);
      expect(events.some(e => e.type === 'content_block_delta')).toBe(true);
    });

    it('should process tool use block', async () => {
      const message: SDKAssistantMessage = {
        type: 'assistant',
        uuid: 'test-uuid-2' as UUID,
        session_id: 'test-session',
        parent_tool_use_id: null,
        message: {
          content: [
            {
              type: 'tool_use',
              id: 'tool_123',
              name: 'Read',
              input: { path: 'test.txt' },
            },
          ],
        },
      };

      const events = [];
      for await (const event of processor.processMessage(message)) {
        events.push(event);
      }

      expect(events.some(e => e.type === 'tool_start')).toBe(true);
      const toolStart = events.find(e => e.type === 'tool_start');
      expect(toolStart).toMatchObject({
        type: 'tool_start',
        tool_name: 'Read',
        tool_id: 'tool_123',
      });
    });

    it('should process tool result block', async () => {
      const message: SDKUserMessage = {
        type: 'user',
        session_id: 'test-session',
        parent_tool_use_id: null,
        message: {
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'tool_123',
              content: 'File contents here',
            },
          ],
        },
      };

      const events = [];
      for await (const event of processor.processMessage(message)) {
        events.push(event);
      }

      expect(events.some(e => e.type === 'tool_stop')).toBe(true);
      const toolStop = events.find(e => e.type === 'tool_stop');
      expect(toolStop).toMatchObject({
        type: 'tool_stop',
        tool_id: 'tool_123',
        is_error: false,
      });
    });
  });

  describe('getAccumulatedBlocks', () => {
    it('should accumulate text blocks', async () => {
      const message: SDKAssistantMessage = {
        type: 'assistant',
        uuid: 'test-uuid-3' as UUID,
        session_id: 'test-session',
        parent_tool_use_id: null,
        message: {
          content: [
            {
              type: 'text',
              text: 'Hello',
            },
          ],
        },
      };

      // Process message
      for await (const _ of processor.processMessage(message)) {
        // Consume events
      }

      const blocks = processor.getAccumulatedBlocks();
      expect(blocks.length).toBe(1);
      expect(blocks[0]).toMatchObject({
        type: 'text',
        content: 'Hello',
      });
    });

    it('should accumulate tool blocks', async () => {
      const messages: SDKAssistantMessage[] = [
        {
          type: 'assistant',
          uuid: 'test-uuid-4' as UUID,
          session_id: 'test-session',
          parent_tool_use_id: null,
          message: {
            content: [
              {
                type: 'tool_use',
                id: 'tool_123',
                name: 'Read',
                input: { path: 'test.txt' },
              },
            ],
          },
        },
      ];

      for (const message of messages) {
        for await (const _ of processor.processMessage(message)) {
          // Consume events
        }
      }

      const blocks = processor.getAccumulatedBlocks();
      expect(blocks.some(b => b.type === 'tool')).toBe(true);
    });
  });

  describe('getTokenUsage', () => {
    it('should track token usage', () => {
      const usage = processor.getTokenUsage();
      expect(usage).toHaveProperty('inputTokens');
      expect(usage).toHaveProperty('outputTokens');
      expect(usage).toHaveProperty('totalTokens');
    });
  });

  describe('reset', () => {
    it('should reset processor state', async () => {
      // Process a message first
      const message: SDKAssistantMessage = {
        type: 'assistant',
        uuid: 'test-uuid-5' as UUID,
        session_id: 'test-session',
        parent_tool_use_id: null,
        message: {
          content: [{ type: 'text', text: 'Hello' }],
        },
      };

      for await (const _ of processor.processMessage(message)) {
        // Consume events
      }

      expect(processor.getAccumulatedBlocks().length).toBeGreaterThan(0);

      // Reset
      processor.reset();

      expect(processor.getAccumulatedBlocks().length).toBe(0);
      expect(processor.getTokenUsage().totalTokens).toBe(0);
    });
  });
});

