import { generateAICompletion } from '../api/ai';
import { getProjectContextOnlyDirectoryStructure } from '../utils/context';
import { buildNaivePrompt } from '../prompts/naive';
import { Pipeline } from './types';
import { CONTEXT } from '@/lib/constants';
import { Action, isValidAction, normalizeAction } from '../core/types';
import { getTool } from '../tools';
import path from 'path';
import { getProjectPath } from '@/lib/fs/operations';

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

      // Start agentic workflow with thinking/reading phase
      console.log(`🧠 Starting agentic workflow with initial prompt...`);
      return await this.runAgentic(projectId, prompt, context);
    } catch (error) {
      console.error(`❌ Error in naive pipeline:`, error);
      return { success: false, error: 'Failed to process modification request' };
    }
  }

  /**
   * Run the agentic workflow where the model can iteratively read files and gather context
   */
  private async runAgentic(projectId: number, prompt: string, context: string) {
    console.log(`🔄 Running agentic workflow for project ID: ${projectId}`);

    let isThinking = true;
    const executionLog: string[] = [];
    const gatheredContext: Record<string, string> = {};
    let iterationCount = 0;
    const MAX_ITERATIONS = 25; // Prevent infinite loops

    // Initial context
    let currentContext = context;

    // Iterative loop for agentic behavior
    while (isThinking && iterationCount < MAX_ITERATIONS) {
      iterationCount++;
      console.log(`🔄 Starting iteration ${iterationCount} of agentic workflow`);

      // Build prompt with current context and execution history
      const messages = buildNaivePrompt(prompt, currentContext);

      // Generate AI response
      console.log(`🤖 Generating agent response for iteration ${iterationCount}`);
      const aiResponse = await generateAICompletion(messages, {
        timeoutMs: 90000, // 90 seconds timeout
        maxTokens: 60000,
      });

      // Parse the AI response
      console.log(`🔍 Parsing AI response for iteration ${iterationCount}`);
      const parsedResponse = this.parseAgentResponse(aiResponse);

      // Log the parsed response
      console.log(
        `📋 Parsed response for iteration ${iterationCount}:`,
        JSON.stringify(parsedResponse, null, 2)
      );

      // Check if the agent is still thinking or ready to execute
      isThinking = parsedResponse.thinking;

      if (isThinking) {
        console.log(`🧠 Agent is still in thinking mode, executing read actions...`);

        // Execute read actions to gather more context
        for (const action of parsedResponse.actions) {
          if (action.action === 'Read' || action.action === 'readFile') {
            console.log(`📖 Reading file: ${action.filePath}`);
            executionLog.push(`Read ${action.filePath}`);

            try {
              // Get the readFile tool
              const readTool = getTool('readFile');
              if (!readTool) {
                console.error(`❌ readFile tool not found`);
                continue;
              }

              // Execute the read tool
              const fullPath = path.join(getProjectPath(projectId), action.filePath);
              const result = await readTool.execute(fullPath);

              if (typeof result === 'object' && result !== null && 'success' in result) {
                if (result.success && 'content' in result) {
                  // Store the file content in gathered context
                  gatheredContext[action.filePath] = result.content as string;
                  console.log(
                    `✅ Successfully read file: ${action.filePath} (${(result.content as string).length} chars)`
                  );
                } else {
                  console.error(`❌ Failed to read file: ${action.filePath}`);
                  gatheredContext[action.filePath] = `Error: Could not read file`;
                }
              }
            } catch (error) {
              console.error(`❌ Error reading file ${action.filePath}:`, error);
              gatheredContext[action.filePath] = `Error: ${error}`;
            }
          }
        }

        // Update context with gathered file contents
        let updatedContext = currentContext;
        if (Object.keys(gatheredContext).length > 0) {
          updatedContext += '\n\n### File Contents:\n\n';
          for (const [filePath, content] of Object.entries(gatheredContext)) {
            updatedContext += `--- File: ${filePath} ---\n${content}\n\n`;
          }
        }

        // Add execution log to context
        updatedContext += '\n\n### Execution Log:\n\n';
        executionLog.forEach((log, index) => {
          updatedContext += `${index + 1}. ${log}\n`;
        });

        // Update for next iteration
        currentContext = updatedContext;
      } else {
        console.log(
          `✅ Agent is ready to execute changes, found ${parsedResponse.actions.length} actions`
        );

        // Return the final actions for execution
        return {
          success: true,
          actions: parsedResponse.actions,
        };
      }
    }

    if (iterationCount >= MAX_ITERATIONS) {
      console.warn(`⚠️ Reached maximum iterations (${MAX_ITERATIONS}) in agentic workflow`);
      return {
        success: false,
        error: `Reached maximum iterations (${MAX_ITERATIONS}) in agentic workflow`,
      };
    }

    // We shouldn't reach here if the workflow is properly structured
    return { success: false, error: 'Agentic workflow completed without actions' };
  }

  /**
   * Parse the AI response to extract structured agent response
   */
  private parseAgentResponse(response: string | { text: string; modelType: string }): {
    thinking: boolean;
    actions: Action[];
  } {
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
        const parsedResponse = JSON.parse(cleanedResponse) as {
          thinking?: boolean;
          actions?: unknown[];
        };

        // Default values
        const result = {
          thinking: true, // Default to thinking mode
          actions: [] as Action[],
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

          // Validate each action
          parsedResponse.actions.forEach((action, idx) => {
            if (isValidAction(action)) {
              result.actions.push(normalizeAction(action as Action));
            } else {
              console.warn(`⚠️ Invalid action at index ${idx}`);
            }
          });

          console.log(`✅ Found ${result.actions.length} valid actions`);
        } else {
          console.warn(`⚠️ Response parsed as JSON but actions is not an array or is missing`);
        }

        return result;
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

      // Return default structure on error
      return { thinking: true, actions: [] };
    } catch (error) {
      console.error('❌ Error parsing agent response:', error);
      return { thinking: true, actions: [] };
    }
  }
}
