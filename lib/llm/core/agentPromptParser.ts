import { Action, normalizeAction, isValidAction } from './types';
import { buildNaivePrompt } from './prompts';
import { generateAICompletion } from '../api/ai';
import { AgentError } from './agentError';

/**
 * Generate a response from the AI and parse it into the agent's thinking state and actions
 */
export async function generateAndParseAgentResponse(
  prompt: string,
  currentContext: string,
  chatHistory: { role: 'system' | 'user' | 'assistant'; content: string }[],
  timeoutMs: number,
  maxTokens: number
): Promise<{ thinking: boolean; actions: Action[] }> {
  // Build prompt and get AI response
  const messages = buildNaivePrompt(prompt, currentContext, chatHistory);
  console.log(`🤖 Generating agent response`);

  const aiResponse = await generateAICompletion(messages, {
    timeoutMs: timeoutMs,
    maxTokens: maxTokens,
  });

  // Parse the AI response
  console.log(`🔍 Parsing AI response`);
  const parsedResponse = parseAgentResponse(aiResponse);
  console.log(`📋 Parsed response:`, JSON.stringify(parsedResponse, null, 2));

  return parsedResponse;
}

/**
 * Parse the AI response to extract structured agent response
 *
 * Processes the LLM response into a structured format with thinking state and actions
 *
 * @param response - The raw response from the LLM
 * @returns Structured object with thinking state and valid actions
 */
export function parseAgentResponse(response: string | { text: string; modelType: string }): {
  thinking: boolean;
  actions: Action[];
} {
  try {
    // Handle if response is an object with text property
    const responseText =
      typeof response === 'object' && response.text ? response.text : (response as string);

    // Clean up the response - remove markdown code blocks if present
    let cleanedResponse = responseText.trim();
    cleanedResponse = cleanedResponse
      .replace(/```(?:json)?[\r\n]?([\s\S]*?)[\r\n]?```/g, '$1')
      .trim();

    console.log(
      '📝 Cleaned response (preview):',
      cleanedResponse.substring(0, 200) + (cleanedResponse.length > 200 ? '...' : '')
    );

    // Default values for the result
    const result = {
      thinking: true, // Default to thinking mode
      actions: [] as Action[],
    };

    try {
      // Parse the response as JSON
      const parsedResponse = JSON.parse(cleanedResponse) as {
        thinking?: boolean;
        actions?: unknown[];
      };

      // Set thinking state if provided
      if (typeof parsedResponse.thinking === 'boolean') {
        result.thinking = parsedResponse.thinking;
      }

      // Parse actions if provided
      if (Array.isArray(parsedResponse.actions)) {
        console.log(
          `✅ Successfully parsed JSON: ${parsedResponse.actions.length} potential actions found`
        );

        // Validate each action and add to result
        const validActions = parsedResponse.actions
          .map((action, idx) => {
            if (isValidAction(action)) {
              return normalizeAction(action as Action);
            } else {
              console.warn(`⚠️ Invalid action at index ${idx}: ${JSON.stringify(action)}`);
              return null;
            }
          })
          .filter((action): action is Action => action !== null);

        result.actions = validActions;
        console.log(`✅ Found ${result.actions.length} valid actions`);
      } else {
        console.warn(`⚠️ Response parsed as JSON but actions is not an array or is missing`);
      }

      return result;
    } catch (jsonError) {
      logJsonParseError(jsonError, cleanedResponse);
      throw new AgentError({
        type: 'parsing',
        message: 'Failed to parse JSON response from LLM',
        details: jsonError instanceof Error ? jsonError.message : String(jsonError),
      });
    }
  } catch (error) {
    console.error('❌ Error parsing agent response:', error);

    // Determine if this is an AgentError or a different type of error
    if (error instanceof AgentError) {
      throw error; // Rethrow AgentError to maintain type information
    }

    // Create a new AgentError for other error types
    throw new AgentError({
      type: 'processing',
      message: 'Error processing agent response',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Log JSON parsing errors with helpful context
 */
export function logJsonParseError(jsonError: unknown, cleanedResponse: string): void {
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

/**
 * Force the agent into execution mode with a final attempt
 */
export async function forceExecutionMode(
  prompt: string,
  currentContext: string,
  chatHistory: { role: 'system' | 'user' | 'assistant'; content: string }[],
  timeoutMs: number,
  maxTokens: number
): Promise<Action[]> {
  console.warn(`⚠️ Forcing agent to execution mode due to duplicate reads or high iteration count`);

  // Add a final warning to context that we're forcing execution
  const forcedExecutionMsg = `\n\n### SYSTEM NOTICE - FORCING EXECUTION MODE:\nYou've attempted to reread files multiple times or have used too many iterations. Based on the files you've already read, proceed to implementation immediately.\n`;
  const finalContext = addWarningSection(currentContext, forcedExecutionMsg);

  // One more attempt with the forced execution message
  const finalMessages = buildNaivePrompt(prompt, finalContext, chatHistory);
  console.log(`🤖 Generating final agent response before forcing execution`);

  try {
    const finalResponse = await generateAICompletion(finalMessages, {
      timeoutMs: timeoutMs,
      maxTokens: maxTokens,
    });

    // Parse the response but override thinking to false
    const finalParsedResponse = parseAgentResponse(finalResponse);
    finalParsedResponse.thinking = false;

    if (finalParsedResponse.actions.length > 0) {
      // Use the actions from the final response
      return finalParsedResponse.actions;
    } else {
      // No actions returned, throw error
      throw new AgentError({
        type: 'processing',
        message: 'Agent unable to produce actions after multiple iterations',
        details: 'The LLM produced a valid response but did not specify any actions to take',
      });
    }
  } catch (error) {
    // Rethrow AgentError to preserve type information
    if (error instanceof AgentError) {
      throw error;
    }

    // Wrap other errors
    throw new AgentError({
      type: 'processing',
      message: 'Failed to force execution mode',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Add warning section to the context
 */
export function addWarningSection(context: string, warningMsg: string): string {
  // Extract the section identifier from the warning message
  const warningIdentifier = warningMsg.split('\n')[0];
  return addSectionToContext(context, warningMsg, warningIdentifier);
}

/**
 * Add a section to the context at a specified position
 * @param context The current context string
 * @param sectionContent The content to add
 * @param sectionIdentifier The identifier of the section for removal/replacement
 * @returns Updated context with the new section added
 */
export function addSectionToContext(
  context: string,
  sectionContent: string,
  sectionIdentifier: string
): string {
  try {
    // Remove any existing section with the same identifier
    const sectionRegex = new RegExp(`\n\n${sectionIdentifier}[\\s\\S]*?(?=\n\n### |$)`, 'g');
    const cleanContext = context.replace(sectionRegex, '').trim();

    // Add the section near the beginning, after any initial instructions
    const parts = cleanContext.split('\n\n', 1);
    if (parts.length > 0) {
      const firstPart = parts[0];
      const restOfContext = cleanContext.substring(firstPart.length);
      return firstPart + '\n\n' + sectionContent + restOfContext;
    }

    // If splitting didn't work, just prepend
    return sectionContent + '\n\n' + cleanContext;
  } catch (error) {
    console.error(`Error adding section to context: ${error}`);
    // Fall back to simple concatenation in case of error
    return sectionContent + '\n\n' + context;
  }
}
