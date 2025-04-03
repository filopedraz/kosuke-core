import { generateAICompletion } from '../api/ai';
import { getProjectContext } from '../utils/context';
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
        context = await getProjectContext(projectId, {
          maxSize: CONTEXT.MAX_CONTEXT_SIZE,
          excludeDirs: CONTEXT.EXCLUDE_DIRS,
          includeExtensions: CONTEXT.INCLUDE_EXTENSIONS,
          excludeFiles: CONTEXT.EXCLUDE_FILES,
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
    let cleanedResponse = responseText;

    // First, try to remove markdown code block syntax with a more comprehensive pattern
    cleanedResponse = cleanedResponse
      .replace(/```(?:json)?[\r\n]?([\s\S]*?)[\r\n]?```/g, '$1')
      .trim();

    // If the response still starts with backticks, try another approach
    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/```json\s*/, '').replace(/```\s*$/, '');
    }

    console.log('📝 Raw response:', responseText.substring(0, 200) + '...');
    console.log('📝 Cleaned response:', cleanedResponse.substring(0, 200) + '...');

    // First, try to parse the entire response as JSON
    try {
      const parsedActions = JSON.parse(cleanedResponse) as Action[];
      console.log(`✅ Successfully parsed JSON: ${parsedActions.length} actions found`);

      // Verify action structure
      if (Array.isArray(parsedActions)) {
        console.log(`✅ Parsed result is an array with ${parsedActions.length} items`);

        // Validate and normalize each action
        const validActions: Action[] = [];

        parsedActions.forEach((action, index) => {
          console.log(
            `Action ${index + 1}:`,
            JSON.stringify({
              action: action.action,
              filePath: action.filePath,
              hasContent: !!action.content,
              contentLength: action.content ? action.content.length : 0,
              hasMessage: !!action.message,
              messageLength: action.message ? action.message.length : 0,
            })
          );

          if (isValidAction(action)) {
            const normalizedAction = normalizeAction(action);
            console.log(
              `✅ Action ${index + 1} is valid and normalized:`,
              JSON.stringify({
                action: normalizedAction.action,
                filePath: normalizedAction.filePath,
              })
            );
            validActions.push(normalizedAction);
          } else {
            console.error(`❌ Action ${index + 1} is invalid:`, JSON.stringify(action));
          }
        });

        console.log(`✅ Validated ${validActions.length} out of ${parsedActions.length} actions`);
        return validActions;
      } else {
        console.error('❌ Parsed result is not an array:', typeof parsedActions);
        return [];
      }
    } catch (error) {
      console.error('❌ Error parsing actions from cleaned response:', error);
      console.error('❌ First 500 chars of cleaned response:', cleanedResponse.substring(0, 500));

      // If that fails, try to extract JSON from the response
      const jsonRegex = /\[\s*\{.*\}\s*\]/s;
      const match = cleanedResponse.match(jsonRegex);

      if (match && match[0]) {
        console.log(`✅ Found JSON array with regex: ${match[0].substring(0, 100)}...`);
        try {
          const parsedActions = JSON.parse(match[0]) as Action[];
          console.log(
            `✅ Successfully parsed regex-extracted JSON: ${parsedActions.length} actions found`
          );
          return parsedActions;
        } catch (regexParseError) {
          console.error('❌ Error parsing regex-extracted JSON:', regexParseError);
        }
      } else {
        console.error('❌ No JSON array found with regex');
      }

      // If still no valid JSON, look for action blocks
      const actionBlocks = cleanedResponse.match(/\{\s*"action":[^}]+\}/g);
      if (actionBlocks && actionBlocks.length > 0) {
        console.log(`✅ Found ${actionBlocks.length} individual action blocks`);
        // Try to parse each block and combine them
        const actions: Action[] = [];
        for (const block of actionBlocks) {
          try {
            console.log(`Parsing action block: ${block.substring(0, 100)}...`);
            const action = JSON.parse(block) as Action;
            console.log(
              `✅ Successfully parsed action block: ${action.action} on ${action.filePath}`
            );
            actions.push(action);
          } catch (e) {
            console.error('❌ Error parsing action block:', e);
            console.error('❌ Action block content:', block);
          }
        }

        if (actions.length > 0) {
          console.log(`✅ Successfully parsed ${actions.length} individual action blocks`);
          return actions;
        }
      } else {
        console.error('❌ No individual action blocks found');
      }

      // If all parsing attempts fail, return an empty array
      console.error('❌ Failed to parse actions from response');
      return [];
    }
  } catch (error) {
    console.error('❌ Error parsing actions:', error);
    return [];
  }
}
