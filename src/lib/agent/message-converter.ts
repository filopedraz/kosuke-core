/**
 * Message Converter
 * Converts database chat messages to a context summary for the Claude Agent
 */

import type { ChatMessage } from '@/lib/db/schema';

/**
 * Create a context summary from previous messages
 * This approach works better with the Claude Agent SDK than trying to replay full conversation
 */
export function createConversationContext(messages: ChatMessage[]): string {
  if (messages.length === 0) {
    return '';
  }

  const contextLines: string[] = [
    '=== Previous Conversation Context ===',
    'This is a continuation of an ongoing conversation. Here is the relevant context from previous messages:',
    '',
  ];

  for (const message of messages) {
    if (message.role === 'user') {
      contextLines.push(`User: ${message.content || '(no content)'}`);
    } else if (message.role === 'assistant') {
      // Extract text content from blocks
      const blocks = message.blocks as Array<Record<string, unknown>> | null;
      if (blocks && blocks.length > 0) {
        const textBlocks = blocks
          .filter(block => block.type === 'text')
          .map(block => block.text || block.content)
          .filter(Boolean);

        if (textBlocks.length > 0) {
          contextLines.push(`Assistant: ${textBlocks.join(' ')}`);
        }
      }
    }
    contextLines.push('');
  }

  contextLines.push('=== End of Previous Context ===');
  contextLines.push('');
  contextLines.push(
    'Continue working on this project, maintaining context from the above conversation.'
  );
  contextLines.push('');

  return contextLines.join('\n');
}
