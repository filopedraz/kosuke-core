import { eq, desc, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import path from 'path';
import { LLM, CONTEXT } from '@/lib/constants';
import { db } from '@/lib/db/drizzle';
import { chatMessages, actions } from '@/lib/db/schema';
import { getProjectPath } from '@/lib/fs/operations';
import { getTool } from '../tools';
import { Action, normalizeAction, isValidAction } from './types';
import { generateAICompletion } from '../api/ai';
import { isWebRequestEnvironment } from '@/lib/environment';
import { buildNaivePrompt } from './prompts';
import { getProjectContextOnlyDirectoryStructure } from '../utils/context';

/**
 * Agent class responsible for orchestrating project modifications and handling UI updates
 */
export class Agent {
  private projectId: number;

  constructor(projectId: number) {
    this.projectId = projectId;
    console.log(`🚀 Agent initialized for project ID: ${projectId}`);
  }

  /**
   * Run the agent to process a project modification request
   */
  async run(prompt: string): Promise<{ success: boolean; error?: string }> {
    console.log(`🤖 Processing modification request for project ID: ${this.projectId}`);
    const processingStart = Date.now();

    try {
      // Get the initial messages from the database
      console.log('🔍 Fetching existing chat messages from database...');
      const history = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.projectId, this.projectId))
        .orderBy(desc(chatMessages.timestamp))
        .limit(LLM.MAX_MESSAGES);

      console.log(`📊 Found ${history.length} existing messages`);

      // Find the last assistant message or create a placeholder
      const lastAssistantMessageIndex = history.findIndex(msg => msg.role === 'assistant');

      let lastAssistantMessage;

      if (lastAssistantMessageIndex === -1) {
        console.log('ℹ️ No assistant message found, creating one...');
        // Create a placeholder message if one doesn't exist
        const [newAssistantMessage] = await db
          .insert(chatMessages)
          .values({
            projectId: this.projectId,
            content: "I'm analyzing your request and preparing to make changes...",
            role: 'assistant',
          })
          .returning();

        console.log(`✅ Created new assistant message with ID: ${newAssistantMessage.id}`);
        lastAssistantMessage = newAssistantMessage;
      } else {
        console.log(`ℹ️ Found existing assistant message at index ${lastAssistantMessageIndex}`);
        lastAssistantMessage = history[lastAssistantMessageIndex];
      }

      // Process with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Processing timeout exceeded'));
        }, LLM.PROCESSING_TIMEOUT);
      });

      try {
        // Create a placeholder assistant message
        console.log('📝 Creating placeholder message for status updates...');
        const initialResult = await this.sendOperationUpdate(
          'edit', // Operation type doesn't matter for placeholder
          '', // No specific file path
          "I'm analyzing your request and preparing to make changes...",
          'pending'
        );
        console.log(`📝 Placeholder message created: ${JSON.stringify(initialResult)}`);

        console.log(
          `🔄 Starting pipeline processing with prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`
        );

        // Run the pipeline
        let pipelineResult: { success: boolean; error?: string; actions?: Action[] };
        try {
          console.log('⏳ Running processPrompt with timeout race...');
          pipelineResult = (await Promise.race([
            this.processPrompt(this.projectId, prompt),
            timeoutPromise,
          ])) as { success: boolean; error?: string; actions?: Action[] };
          console.log(`✅ Pipeline processing completed successfully`);
          console.log(`📊 Pipeline result success: ${pipelineResult.success}`);
          console.log(`📊 Pipeline result error: ${pipelineResult.error || 'none'}`);
          console.log(
            `📊 Pipeline result actions: ${pipelineResult.actions ? pipelineResult.actions.length : 0}`
          );
          if (pipelineResult.actions && pipelineResult.actions.length > 0) {
            console.log(`📊 First action: ${JSON.stringify(pipelineResult.actions[0])}`);
          }
          console.log(`📊 Full pipeline result: ${JSON.stringify(pipelineResult, null, 2)}`);
        } catch (pipelineError) {
          console.error(`❌ Pipeline processing error:`, pipelineError);
          throw pipelineError;
        }

        // Handle the actions from the pipeline
        console.log(
          `🔍 Checking actions from pipeline result. Has actions: ${!!pipelineResult.actions}, Length: ${pipelineResult.actions?.length || 0}`
        );

        if (pipelineResult.actions && pipelineResult.actions.length > 0) {
          console.log(`🔄 Found ${pipelineResult.actions.length} actions to execute:`);
          pipelineResult.actions.forEach((action: Action, index: number) => {
            console.log(
              `   Action ${index + 1}: ${action.action} on ${action.filePath} (message: ${action.message.substring(0, 50)}...)`
            );
          });

          // Execute each action in sequence
          let allActionsSuccessful = true;
          for (const [index, action] of pipelineResult.actions.entries()) {
            console.log(
              `⏳ Executing action ${index + 1}/${pipelineResult.actions.length}: ${action.action} on ${action.filePath}`
            );
            console.log(`💾 Action details: ${JSON.stringify(action, null, 2)}`);

            const actionStart = Date.now();
            const actionSuccess = await this.executeAction(action);
            const actionEnd = Date.now();

            console.log(
              `${actionSuccess ? '✅' : '❌'} Action ${index + 1} execution ${actionSuccess ? 'succeeded' : 'failed'} in ${actionEnd - actionStart}ms`
            );

            if (!actionSuccess) {
              console.error(
                `❌ Action ${index + 1} (${action.action} on ${action.filePath}) failed to execute. Stopping execution.`
              );
              allActionsSuccessful = false;
              break;
            }
          }

          // Generate a summary of changes
          if (allActionsSuccessful) {
            console.log('🔄 Generating summary of changes...');
            const summary = await this.generateChangesSummary(pipelineResult.actions);
            console.log(`📝 Summary generated: ${summary}`);

            // Update the message content with the summary
            if (initialResult.message?.id) {
              console.log(`📝 Updating message ${initialResult.message.id} with summary...`);
              await db
                .update(chatMessages)
                .set({
                  content: summary,
                  timestamp: new Date(),
                })
                .where(eq(chatMessages.id, initialResult.message.id));

              console.log(`✅ Updated message content with summary`);
            } else {
              console.error(`❌ No message ID found in initialResult to update with summary`);
            }
          } else {
            console.log(`⚠️ Some actions failed to execute, sending error update...`);
            await this.sendOperationUpdate(
              'error',
              '',
              `I encountered some issues while making the requested changes. Please check the operation log for details.`,
              'error'
            );
            console.log(`⚠️ Error update sent`);
          }
        } else {
          console.warn(
            `⚠️ No actions returned from pipeline. Pipeline result: ${JSON.stringify(pipelineResult)}`
          );
          console.log(`⚠️ Sending error update because no actions were found...`);
          await this.sendOperationUpdate(
            'error',
            '',
            `I was unable to understand how to make the requested changes. Please try rephrasing your request.`,
            'error'
          );
          console.log(`⚠️ Error update sent for no actions`);
        }

        console.log(`✅ Successfully processed modification request`);
      } catch (error) {
        console.error('❌ Error or timeout processing modification:', error);
        // Update message with error information
        await db
          .update(chatMessages)
          .set({
            content:
              'I encountered an error while processing your request. Please try again later.',
            timestamp: new Date(),
          })
          .where(eq(chatMessages.id, lastAssistantMessage.id));

        console.log(`⚠️ Updated message with error information`);
        throw error;
      }

      // Only try to revalidate the path if we're in a web request context
      if (isWebRequestEnvironment()) {
        try {
          revalidatePath(`/projects/${this.projectId}`);
        } catch (revalidateError) {
          console.warn(`⚠️ Could not revalidate path in Agent.run: ${revalidateError}`);
          // Don't fail the operation just because revalidation failed
        }
      } else {
        console.log(`🔍 Skipping revalidatePath in script context (Agent.run)`);
      }

      const processingEnd = Date.now();
      console.log(`⏱️ Total processing time: ${processingEnd - processingStart}ms`);

      return { success: true };
    } catch (error) {
      console.error(`❌ Error in Agent.run:`, error);
      return { success: false, error: 'Failed to process modification request' };
    }
  }

  /**
   * Process a user prompt and return a list of actions to perform
   * @param projectId - The ID of the project to modify
   * @param prompt - The user's prompt/request
   * @returns Promise with actions to be performed by the agent
   */
  private async processPrompt(projectId: number, prompt: string) {
    console.log(`🤖 Processing prompt for project ID: ${projectId}`);

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
      console.error(`❌ Error in processPrompt:`, error);
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

  /**
   * Generate a summary of changes made to the project
   */
  private async generateChangesSummary(actions: Action[]): Promise<string> {
    try {
      // Filter out readFile actions as they don't represent actual changes
      const changeActions = actions.filter(a => a.action !== 'Read' && a.action !== 'readFile');

      // Group actions by type
      const createdFiles = changeActions
        .filter(a => a.action === 'createFile')
        .map(a => a.filePath);
      const editedFiles = changeActions.filter(a => a.action === 'editFile').map(a => a.filePath);
      const deletedFiles = changeActions
        .filter(a => a.action === 'deleteFile')
        .map(a => a.filePath);

      // Create prompt for AI to summarize changes
      const summaryPrompt = `
      I've made the following changes to the project:
      
      ${createdFiles.length > 0 ? `Created files:\n${createdFiles.map(f => `- ${f}`).join('\n')}\n` : ''}
      ${editedFiles.length > 0 ? `Modified files:\n${editedFiles.map(f => `- ${f}`).join('\n')}\n` : ''}
      ${deletedFiles.length > 0 ? `Deleted files:\n${deletedFiles.map(f => `- ${f}`).join('\n')}\n` : ''}
      
      Please provide a concise summary of the changes made. Plain text, no markdown.
      `;

      console.log('Generating AI summary for changes with prompt:', summaryPrompt);

      // Use the AI to generate a summary
      const summaryResponse = await generateAICompletion(
        [{ role: 'user', content: summaryPrompt }],
        {
          timeoutMs: 30000,
          maxTokens: 500,
        }
      );

      // Extract the summary text
      const summary =
        typeof summaryResponse === 'object' && 'text' in summaryResponse
          ? summaryResponse.text
          : String(summaryResponse);

      console.log('AI generated summary:', summary);
      return summary;
    } catch (error) {
      console.error('Error generating changes summary:', error);
      return "I've completed all the requested changes successfully.";
    }
  }

  /**
   * Send an operation update to the chat and save to actions table
   */
  async sendOperationUpdate(
    operationType: 'create' | 'edit' | 'delete' | 'error' | 'read' | 'createDir' | 'removeDir',
    filePath: string,
    operationMessage: string,
    status: 'pending' | 'completed' | 'error' = 'completed'
  ) {
    try {
      console.log(
        `📝 Sending operation update: ${operationType} ${filePath} (${status}): ${operationMessage.substring(0, 50)}...`
      );

      // Find the most recent assistant message to update instead of creating a new one
      const existingMessages = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.projectId, this.projectId))
        .orderBy(desc(chatMessages.timestamp))
        .limit(5); // Get a few most recent messages

      let messageId: number;

      // Find the last assistant message that's being used for operations
      const lastAssistantMessage = existingMessages.find(
        msg =>
          msg.role === 'assistant' &&
          (msg.content.includes('analysing your request') ||
            msg.content.includes('analyzing your request') ||
            msg.content.includes('I am analyzing') ||
            msg.content.includes("I'm analyzing") ||
            msg.content.includes('making changes'))
      );

      if (lastAssistantMessage) {
        // Use the existing message
        messageId = lastAssistantMessage.id;
        console.log(`✅ Using existing assistant message: ${messageId} for operation`);
      } else {
        // Create a new message for the operation update
        console.log(`📝 Creating new message for operation update...`);
        const [newMessage] = await db
          .insert(chatMessages)
          .values({
            projectId: this.projectId,
            content: `I'm analyzing your request and preparing to make changes...`,
            role: 'assistant',
          })
          .returning();

        messageId = newMessage.id;
        console.log(`✅ Created new assistant message: ${messageId} for operation`);
      }

      // Map operationType to proper type for database
      let dbOperationType = operationType;
      if (operationType === 'createDir') {
        dbOperationType = 'create';
      } else if (operationType === 'removeDir') {
        dbOperationType = 'delete';
      }

      // Add the operation to actions table
      console.log(
        `📝 Inserting action into database: messageId=${messageId}, type=${dbOperationType}, path=${filePath}, status=${status}`
      );
      try {
        const [insertedAction] = await db
          .insert(actions)
          .values({
            messageId: messageId,
            type: dbOperationType,
            path: filePath,
            status,
            timestamp: new Date(),
          })
          .returning();

        console.log(
          `✅ Action saved: ${operationType} ${filePath} for message ${messageId} with status ${status}`
        );
        console.log(`✅ Inserted action: ${JSON.stringify(insertedAction)}`);
      } catch (dbError) {
        console.error(`❌ Error inserting action into database:`, dbError);
      }

      // Only try to revalidate the path if we're in a web request context
      if (isWebRequestEnvironment()) {
        try {
          revalidatePath(`/projects/${this.projectId}`);
        } catch (revalidateError) {
          console.warn(`⚠️ Could not revalidate path: ${revalidateError}`);
          // Don't fail the operation just because revalidation failed
        }
      } else {
        console.log(`🔍 Skipping revalidatePath in script context`);
      }

      return {
        success: true,
        message: { id: messageId, content: operationMessage, role: 'assistant' },
      };
    } catch (error) {
      console.error(`❌ Error sending operation update:`, error);
      return { success: false, error: 'Failed to send operation update' };
    }
  }

  /**
   * Execute a single action
   */
  async executeAction(action: Action): Promise<boolean> {
    console.log(`🔧 Executing action: ${action.action} on ${action.filePath}`);
    console.log(`🔧 Action details: ${JSON.stringify(action, null, 2)}`);

    try {
      // Normalize the action to ensure compatibility
      const normalizedAction = normalizeAction(action);
      console.log(`🔧 Normalized action: ${JSON.stringify(normalizedAction, null, 2)}`);

      // Get the appropriate tool
      // The tool name should match exactly what's in the tools array
      const toolName = normalizedAction.action;
      console.log(`🔧 Looking for tool with name: ${toolName}`);

      const tool = getTool(toolName);

      if (!tool) {
        console.error(`❌ Unknown action: ${action.action}, normalized to: ${toolName}`);
        await this.sendOperationUpdate(
          'error',
          action.filePath,
          `Error: Unknown action '${action.action}'`,
          'error'
        );
        return false;
      }

      // Map action type to operation type
      const operationType =
        normalizedAction.action === 'createFile'
          ? 'create'
          : normalizedAction.action === 'createDirectory'
            ? 'createDir'
            : normalizedAction.action === 'editFile'
              ? 'edit'
              : normalizedAction.action === 'deleteFile'
                ? 'delete'
                : normalizedAction.action === 'removeDirectory'
                  ? 'removeDir'
                  : normalizedAction.action === 'search'
                    ? 'read'
                    : normalizedAction.action === 'Read' || normalizedAction.action === 'readFile'
                      ? 'read'
                      : 'error';

      // Send an update about the operation we're about to perform with pending status
      console.log(
        `📝 Sending operation update for ${operationType} ${normalizedAction.filePath} (pending)...`
      );
      const result = await this.sendOperationUpdate(
        operationType,
        normalizedAction.filePath,
        normalizedAction.message,
        'pending'
      );

      if (!result.success || !result.message) {
        console.error(`❌ Failed to create operation message`);
        return false;
      }

      const messageId = result.message.id;
      console.log(`✅ Created operation message with ID: ${messageId}`);

      // Execute the tool with the appropriate parameters
      try {
        switch (normalizedAction.action) {
          case 'editFile':
          case 'createFile': {
            if (!normalizedAction.content) {
              console.error(`❌ Missing content for ${normalizedAction.action} action`);
              await this.sendOperationUpdate(
                'error',
                normalizedAction.filePath,
                `Error: Missing content for ${normalizedAction.action} action on ${normalizedAction.filePath}`,
                'error'
              );
              return false;
            }
            // Construct full path for file operations
            const fullPath = path.join(getProjectPath(this.projectId), normalizedAction.filePath);
            console.log(`📝 Executing ${normalizedAction.action} on full path: ${fullPath}`);
            console.log(`📝 Content length: ${normalizedAction.content.length} characters`);
            const success = await tool.execute(fullPath, normalizedAction.content);

            if (!success) {
              console.error(
                `❌ Failed to ${normalizedAction.action} file: ${normalizedAction.filePath}`
              );
              await this.sendOperationUpdate(
                'error',
                normalizedAction.filePath,
                `Error: Failed to ${normalizedAction.action} file ${normalizedAction.filePath}`,
                'error'
              );
              return false;
            }

            // Update operation status to completed after successful execution
            console.log(`📝 Updating action status to completed in database...`);
            await db
              .update(actions)
              .set({
                status: 'completed',
                timestamp: new Date(),
              })
              .where(
                and(
                  eq(actions.messageId, messageId),
                  eq(actions.path, normalizedAction.filePath),
                  eq(
                    actions.type,
                    operationType === 'createDir' || operationType === 'removeDir'
                      ? operationType === 'createDir'
                        ? 'create'
                        : 'delete'
                      : operationType
                  )
                )
              );

            console.log(
              `✅ Updated operation status to completed: ${operationType} ${normalizedAction.filePath}`
            );
            break;
          }
          case 'deleteFile':
          case 'removeDirectory': {
            // Construct full path for file operations
            const deletePath = path.join(getProjectPath(this.projectId), normalizedAction.filePath);
            console.log(`📝 Executing ${normalizedAction.action} on full path: ${deletePath}`);
            const success = await tool.execute(deletePath);

            if (!success) {
              console.error(
                `❌ Failed to ${normalizedAction.action === 'deleteFile' ? 'delete file' : 'remove directory'}: ${normalizedAction.filePath}`
              );
              await this.sendOperationUpdate(
                'error',
                normalizedAction.filePath,
                `Error: Failed to ${normalizedAction.action === 'deleteFile' ? 'delete file' : 'remove directory'} ${normalizedAction.filePath}`,
                'error'
              );
              return false;
            }

            // Update operation status to completed after successful execution
            console.log(`📝 Updating action status to completed in database...`);
            await db
              .update(actions)
              .set({
                status: 'completed',
                timestamp: new Date(),
              })
              .where(
                and(
                  eq(actions.messageId, messageId),
                  eq(actions.path, normalizedAction.filePath),
                  eq(
                    actions.type,
                    operationType === 'createDir' || operationType === 'removeDir'
                      ? operationType === 'createDir'
                        ? 'create'
                        : 'delete'
                      : operationType
                  )
                )
              );

            console.log(
              `✅ Updated operation status to completed: ${operationType} ${normalizedAction.filePath}`
            );
            break;
          }
          case 'createDirectory': {
            // Construct full path for directory operations
            const dirPath = path.join(getProjectPath(this.projectId), normalizedAction.filePath);
            console.log(`📝 Executing ${normalizedAction.action} on full path: ${dirPath}`);
            const success = await tool.execute(dirPath);

            if (!success) {
              console.error(`❌ Failed to create directory: ${normalizedAction.filePath}`);
              await this.sendOperationUpdate(
                'error',
                normalizedAction.filePath,
                `Error: Failed to create directory ${normalizedAction.filePath}`,
                'error'
              );
              return false;
            }

            // Update operation status to completed after successful execution
            console.log(`📝 Updating action status to completed in database...`);
            await db
              .update(actions)
              .set({
                status: 'completed',
                timestamp: new Date(),
              })
              .where(
                and(
                  eq(actions.messageId, messageId),
                  eq(actions.path, normalizedAction.filePath),
                  eq(
                    actions.type,
                    operationType === 'createDir' || operationType === 'removeDir'
                      ? operationType === 'createDir'
                        ? 'create'
                        : 'delete'
                      : operationType
                  )
                )
              );

            console.log(
              `✅ Updated operation status to completed: ${operationType} ${normalizedAction.filePath}`
            );
            break;
          }
          case 'search': {
            // Execute the search
            console.log(`📝 Executing search for: ${normalizedAction.filePath}`);
            await tool.execute(normalizedAction.filePath);

            // Update operation status to completed after successful execution
            console.log(`📝 Updating action status to completed in database...`);
            await db
              .update(actions)
              .set({
                status: 'completed',
                timestamp: new Date(),
              })
              .where(
                and(
                  eq(actions.messageId, messageId),
                  eq(actions.path, normalizedAction.filePath),
                  eq(
                    actions.type,
                    operationType === 'createDir' || operationType === 'removeDir'
                      ? operationType === 'createDir'
                        ? 'create'
                        : 'delete'
                      : operationType
                  )
                )
              );

            console.log(
              `✅ Updated operation status to completed: ${operationType} ${normalizedAction.filePath}`
            );
            break;
          }
          case 'Read':
          case 'readFile': {
            // Construct full path for file operations
            const fullPath = path.join(getProjectPath(this.projectId), normalizedAction.filePath);
            console.log(`📝 Executing read on full path: ${fullPath}`);
            await tool.execute(fullPath);

            // Update operation status to completed after successful execution
            console.log(`📝 Updating action status to completed in database...`);
            await db
              .update(actions)
              .set({
                status: 'completed',
                timestamp: new Date(),
              })
              .where(
                and(
                  eq(actions.messageId, messageId),
                  eq(actions.path, normalizedAction.filePath),
                  eq(
                    actions.type,
                    operationType === 'createDir' || operationType === 'removeDir'
                      ? operationType === 'createDir'
                        ? 'create'
                        : 'delete'
                      : operationType
                  )
                )
              );

            console.log(
              `✅ Updated operation status to completed: ${operationType} ${normalizedAction.filePath}`
            );
            break;
          }
          default:
            console.error(`❌ Unsupported action: ${normalizedAction.action}`);
            await this.sendOperationUpdate(
              'error',
              normalizedAction.filePath,
              `Error: Unsupported action '${normalizedAction.action}'`,
              'error'
            );
            return false;
        }

        return true;
      } catch (error) {
        console.error(`❌ Error executing action:`, error);
        // Update the operation status to error
        console.log(`📝 Updating action status to error in database...`);
        await db
          .update(actions)
          .set({
            status: 'error',
            timestamp: new Date(),
          })
          .where(
            and(
              eq(actions.messageId, messageId),
              eq(actions.path, normalizedAction.filePath),
              eq(
                actions.type,
                operationType === 'createDir' || operationType === 'removeDir'
                  ? operationType === 'createDir'
                    ? 'create'
                    : 'delete'
                  : operationType
              )
            )
          );

        await this.sendOperationUpdate(
          'error',
          normalizedAction.filePath,
          `Error: Failed to ${normalizedAction.action} on ${normalizedAction.filePath}: ${(error as Error).message}`,
          'error'
        );
        return false;
      }
    } catch (error) {
      console.error(`❌ Error in executeAction:`, error);
      await this.sendOperationUpdate(
        'error',
        action.filePath,
        `Error: Failed to ${action.action} on ${action.filePath}: ${(error as Error).message}`,
        'error'
      );
      return false;
    }
  }
}
