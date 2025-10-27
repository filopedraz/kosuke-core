/**
 * Token Counter
 * Wrapper around tiktoken for counting tokens in text
 * Used for tracking Claude API usage and costs
 */

import { encoding_for_model, type TiktokenModel } from 'tiktoken';

// Cache encoding instances for performance
const encodingCache = new Map<string, ReturnType<typeof encoding_for_model>>();

/**
 * Get or create an encoding instance for a model
 */
function getEncoding(model: string) {
  if (!encodingCache.has(model)) {
    try {
      // Try to get encoding for the specific model
      const encoding = encoding_for_model(model as TiktokenModel);
      encodingCache.set(model, encoding);
    } catch {
      // Fall back to cl100k_base (used by most Claude models)
      const encoding = encoding_for_model('gpt-4');
      encodingCache.set(model, encoding);
    }
  }
  return encodingCache.get(model)!;
}

/**
 * Count tokens in a text string
 *
 * @param text - The text to count tokens for
 * @param model - The model to use for encoding (default: gpt-4 which uses cl100k_base)
 * @returns The number of tokens in the text
 */
export function countTokens(text: string, model: string = 'gpt-4'): number {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  try {
    const encoding = getEncoding(model);
    const tokens = encoding.encode(text);
    return tokens.length;
  } catch (error) {
    console.error('Error counting tokens:', error);
    // Fallback: rough estimate (1 token ≈ 4 characters)
    return Math.ceil(text.length / 4);
  }
}
