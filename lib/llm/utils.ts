import { encoding_for_model } from 'tiktoken';

/**
 * Count tokens using tiktoken library
 */
export function countTokens(text: string): number {
  try {
    // cl100k_base is the encoding used by GPT-4 and GPT-3.5 Turbo
    const enc = encoding_for_model('gpt-4o');
    const tokens = enc.encode(text);
    return tokens.length;
  } catch (error) {
    console.warn(
      'Error counting tokens with tiktoken, falling back to character approximation:',
      error
    );
    // Fallback to approximately 4 characters per token
    return Math.ceil(text.length / 4);
  }
}

/**
 * Format a token count for display
 */
export function formatTokenCount(count: number): string {
  if (count < 1000) {
    return count.toString();
  }
  return `${(count / 1000).toFixed(1)}k`;
}
