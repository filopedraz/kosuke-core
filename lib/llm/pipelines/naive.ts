import { generateAICompletion } from '../api/ai';
import { getProjectContextOnlyDirectoryStructure } from '../utils/context';
import { buildNaivePrompt } from '../prompts/naive';
import { Pipeline } from './types';
import { CONTEXT } from '@/lib/constants';
import { Action, isValidAction, normalizeAction } from '../core/types';

/**
 * Implementation of the naive pipeline which processes project modifications
 */
export class NaivePipeline implements Pipeline {
  async processPrompt(projectId: number, prompt: string) {
    console.log(`🤖 Processing naive pipeline for project ID: ${projectId}`);

    try {
      // Get the project context
      let context = '';
      try {
        console.log(`🔍 Getting project context for projectId: ${projectId}`);
        context = await getProjectContextOnlyDirectoryStructure(projectId, {
          maxSize: CONTEXT.MAX_CONTEXT_SIZE,
          excludeDirs: CONTEXT.EXCLUDE_DIRS,
        });
        console.log(`✅ Successfully retrieved project context`);
      } catch (contextError) {
        console.warn('⚠️ Error getting project context:', contextError);
        // Continue without context
      }

      // Build the prompt with context
      const messages = buildNaivePrompt(prompt, context);

      // Generate the AI response
      console.log(`🤖 Generating agent response using AI SDK`);
      const aiResponse = await generateAICompletion(messages, {
        timeoutMs: 90000, // 90 seconds timeout
        maxTokens: 2000,
      });

      // Parse the AI response to get the actions
      console.log(`🔍 Parsing AI response to extract actions...`);
      const actions = parseActionsFromResponse(aiResponse);
      console.log(`📋 Found ${actions.length} actions to execute`);

      // If no actions were parsed, return empty result
      if (actions.length === 0) {
        return {
          success: true,
          actions: [],
        };
      }

      return {
        success: true,
        actions,
      };
    } catch (error) {
      console.error(`❌ Error in naive pipeline:`, error);
      return { success: false, error: 'Failed to process modification request' };
    }
  }
}

/**
 * Parse the AI response to extract structured actions
 */
function parseActionsFromResponse(
  response: string | { text: string; modelType: string }
): Action[] {
  try {
    // Handle if response is an object (from Anthropic API)
    const responseText =
      typeof response === 'object' && response.text ? response.text : (response as string);

    // Clean up the response - remove markdown code blocks if present
    let cleanedResponse = responseText.trim();

    // Remove markdown code blocks
    cleanedResponse = cleanedResponse
      .replace(/```(?:json)?[\r\n]?([\s\S]*?)[\r\n]?```/g, '$1')
      .trim();

    // Log a preview of the response for debugging
    console.log(
      '📝 Cleaned response (preview):',
      cleanedResponse.substring(0, 200) + (cleanedResponse.length > 200 ? '...' : '')
    );

    // Parse the response as JSON
    try {
      const parsedActions = JSON.parse(cleanedResponse) as unknown[];

      if (Array.isArray(parsedActions) && parsedActions.length > 0) {
        console.log(`✅ Successfully parsed JSON: ${parsedActions.length} potential actions found`);

        const validActions: Action[] = [];

        // Validate each action
        parsedActions.forEach((action, idx) => {
          if (isValidAction(action)) {
            validActions.push(normalizeAction(action as Action));
          } else {
            console.warn(`⚠️ Invalid action at index ${idx}`);
          }
        });

        console.log(`✅ Found ${validActions.length} valid actions`);
        return validActions;
      } else {
        console.warn(`⚠️ Response parsed as JSON but is not an array or is empty`);
      }
    } catch (jsonError) {
      console.error(`❌ Error parsing JSON:`, jsonError);

      // Show context around the error if possible
      if (jsonError instanceof SyntaxError && jsonError.message.includes('position')) {
        const posMatch = jsonError.message.match(/position (\d+)/);
        if (posMatch && posMatch[1]) {
          const errorPos = parseInt(posMatch[1], 10);
          const start = Math.max(0, errorPos - 30);
          const end = Math.min(cleanedResponse.length, errorPos + 30);

          console.log(`⚠️ JSON error at position ${errorPos}. Context around error:`);
          console.log(
            `Error context: ...${cleanedResponse.substring(start, errorPos)}[ERROR]${cleanedResponse.substring(errorPos, end)}...`
          );
        }
      }
    }

    return [];
  } catch (error) {
    console.error('❌ Error parsing actions:', error);
    return [];
  }
}
