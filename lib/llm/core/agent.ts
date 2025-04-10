import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import path from 'path';
import { LLM, CONTEXT } from '@/lib/constants';
import { db } from '@/lib/db/drizzle';
import { chatMessages, actions } from '@/lib/db/schema';
import { getProjectPath } from '@/lib/fs/operations';
import { getTool } from '../tools';
import { Action, normalizeAction, isValidAction } from './types';
import { generateAICompletion, generateSummaryWithFlash } from '../api/ai';
import { isWebRequestEnvironment } from '@/lib/environment';
import { buildNaivePrompt } from './prompts';
import { getProjectContextOnlyDirectoryStructure } from '../utils/context';

// Action operation type mapping for database operations
type OperationType = 'create' | 'edit' | 'delete' | 'error' | 'read' | 'createDir' | 'removeDir';

// Action execution result type
type ActionExecutionResult = {
  success: boolean;
  error?: string;
  actions?: Action[];
};

/**
 * Agent class responsible for orchestrating project modifications and handling UI updates
 */
export class Agent {
  private projectId: number;
  private readonly MAX_ITERATIONS = 25; // Prevent infinite loops
  private readonly DEFAULT_TIMEOUT_MS = 90000; // 90 seconds timeout for AI completions
  private readonly DEFAULT_MAX_TOKENS = 60000; // Maximum tokens for AI completions

  constructor(projectId: number) {
    this.projectId = projectId;
    console.log(`🚀 Agent initialized for project ID: ${projectId}`);
  }

  /**
   * Main public method to run the agent to process a project modification request
   */
  async run(prompt: string): Promise<{ success: boolean; error?: string }> {
    console.log(`🤖 Processing modification request for project ID: ${this.projectId}`);
    const processingStart = Date.now();

    try {
      // Create timeout promise for safety
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Processing timeout exceeded'));
        }, LLM.PROCESSING_TIMEOUT);
      });

      try {
        // Get context and run the agent to get actions
        let context = '';
        try {
          console.log(`🔍 Getting project context for projectId: ${this.projectId}`);
          context = await getProjectContextOnlyDirectoryStructure(this.projectId, {
            maxSize: CONTEXT.MAX_CONTEXT_SIZE,
            excludeDirs: CONTEXT.EXCLUDE_DIRS,
          });
          console.log(`✅ Successfully retrieved project context`);
        } catch (contextError) {
          console.warn('⚠️ Error getting project context:', contextError);
          // Continue without context
        }

        // Run the agentic workflow with timeout protection
        console.log('⏳ Running agentic workflow with timeout race...');
        const pipelineResult = (await Promise.race([
          this.runAgentic(this.projectId, prompt, context),
          timeoutPromise,
        ])) as ActionExecutionResult;

        this.logPipelineResult(pipelineResult);

        // Execute actions if any were returned
        if (pipelineResult.actions && pipelineResult.actions.length > 0) {
          await this.executeActions(pipelineResult.actions);
        } else {
          console.warn(
            `⚠️ No actions returned from pipeline. Pipeline result: ${JSON.stringify(pipelineResult)}`
          );
          await this.sendOperationUpdate(
            'error',
            '',
            `I was unable to understand how to make the requested changes. Please try rephrasing your request.`,
            'error'
          );
        }
      } catch (error) {
        // Handle error during processing
        console.error('❌ Error or timeout processing modification:', error);
        await this.sendOperationUpdate(
          'error',
          '',
          'I encountered an error while processing your request. Please try again later.',
          'error'
        );
        throw error;
      }

      // Revalidate path if in web environment
      this.tryRevalidatePath();

      const processingEnd = Date.now();
      console.log(`⏱️ Total processing time: ${processingEnd - processingStart}ms`);

      return { success: true };
    } catch (error) {
      console.error(`❌ Error in Agent.run:`, error);
      return { success: false, error: 'Failed to process modification request' };
    }
  }

  /**
   * Run the agentic workflow where the model can iteratively read files and gather context
   */
  private async runAgentic(
    projectId: number,
    prompt: string,
    context: string
  ): Promise<ActionExecutionResult> {
    console.log(`🔄 Running agentic workflow for project ID: ${projectId}`);

    let isThinking = true;
    const executionLog: string[] = [];
    const gatheredContext: Record<string, string> = {};
    let iterationCount = 0;

    // Fetch chat history for context
    const chatHistory = await this.fetchChatHistory(projectId);
    console.log(`📝 Fetched ${chatHistory.length} previous chat messages for context`);

    // Initial context
    let currentContext = context;

    // Iterative loop for agentic behavior
    while (isThinking && iterationCount < this.MAX_ITERATIONS) {
      iterationCount++;
      console.log(`🔄 Starting iteration ${iterationCount} of agentic workflow`);

      // Send a "Thinking..." message before each AI completion call
      await this.sendOperationUpdate('read', '', 'Thinking...', 'pending');

      // Build prompt and get AI response
      const messages = buildNaivePrompt(prompt, currentContext, chatHistory);
      console.log(`🤖 Generating agent response for iteration ${iterationCount}`);
      const aiResponse = await generateAICompletion(messages, {
        timeoutMs: this.DEFAULT_TIMEOUT_MS,
        maxTokens: this.DEFAULT_MAX_TOKENS,
      });

      // Parse the AI response
      console.log(`🔍 Parsing AI response for iteration ${iterationCount}`);
      const parsedResponse = this.parseAgentResponse(aiResponse);
      console.log(
        `📋 Parsed response for iteration ${iterationCount}:`,
        JSON.stringify(parsedResponse, null, 2)
      );

      // Check if the agent is still thinking or ready to execute
      isThinking = parsedResponse.thinking;

      if (isThinking) {
        // Execute read actions to gather more context
        await this.executeReadActionsForContext(
          parsedResponse.actions,
          projectId,
          executionLog,
          gatheredContext
        );

        // Update context with gathered information
        currentContext = this.updateContext(currentContext, gatheredContext, executionLog);
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

    if (iterationCount >= this.MAX_ITERATIONS) {
      console.warn(`⚠️ Reached maximum iterations (${this.MAX_ITERATIONS}) in agentic workflow`);
      return {
        success: false,
        error: `Reached maximum iterations (${this.MAX_ITERATIONS}) in agentic workflow`,
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
      const changeActions = actions.filter(a => a.action !== 'readFile');

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

      // Use Gemini Flash to generate a summary
      const summary = await generateSummaryWithFlash([{ role: 'user', content: summaryPrompt }], {
        temperature: 0.3,
        maxTokens: 500,
      });

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
    operationType: OperationType,
    filePath: string,
    operationMessage: string,
    status: 'pending' | 'completed' | 'error' = 'completed'
  ) {
    try {
      console.log(
        `📝 Sending operation update: ${operationType} ${filePath} (${status}): ${operationMessage.substring(0, 50)}...`
      );

      // Always create a new message for each operation update to provide real-time feedback
      console.log(`📝 Creating new message for operation update...`);
      const [newMessage] = await db
        .insert(chatMessages)
        .values({
          projectId: this.projectId,
          content: operationMessage,
          role: 'assistant',
        })
        .returning();

      const messageId = newMessage.id;
      console.log(`✅ Created new assistant message: ${messageId} for operation`);

      // Map operationType to proper type for database
      const dbOperationType = this.mapOperationTypeForDb(operationType);

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
      this.tryRevalidatePath();

      // Preview refresh will happen automatically through polling mechanism

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
      const operationType = this.mapActionToOperationType(normalizedAction.action);

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
        // Execute the tool based on action type
        const success = await this.executeToolAction(normalizedAction, tool);

        if (!success) {
          console.error(`❌ Failed to ${normalizedAction.action} on: ${normalizedAction.filePath}`);
          await this.updateActionStatus(
            messageId,
            normalizedAction.filePath,
            operationType,
            'error'
          );
          // Update the message content to indicate failure
          await this.updateMessageContent(
            messageId,
            `Error: Failed to ${normalizedAction.action} on ${normalizedAction.filePath}`
          );
          return false;
        }

        // Update operation status to completed after successful execution
        await this.updateActionStatus(
          messageId,
          normalizedAction.filePath,
          operationType,
          'completed'
        );
        console.log(
          `✅ Updated operation status to completed: ${operationType} ${normalizedAction.filePath}`
        );

        // Keep the original message from the LLM without appending completion status
        return true;
      } catch (error) {
        console.error(`❌ Error executing action:`, error);
        // Update the operation status to error
        await this.updateActionStatus(messageId, normalizedAction.filePath, operationType, 'error');
        // Update the message content to indicate error
        await this.updateMessageContent(
          messageId,
          `Error: Failed to ${normalizedAction.action} on ${normalizedAction.filePath}: ${(error as Error).message}`
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

  /**
   * Execute all actions in sequence and generate a summary
   */
  private async executeActions(actions: Action[]) {
    console.log(`🔄 Found ${actions.length} actions to execute:`);
    actions.forEach((action: Action, index: number) => {
      console.log(
        `   Action ${index + 1}: ${action.action} on ${action.filePath} (message: ${action.message.substring(0, 50)}...)`
      );
    });

    // Execute each action in sequence
    let allActionsSuccessful = true;
    const executedActions: Action[] = [];

    for (const [index, action] of actions.entries()) {
      console.log(
        `⏳ Executing action ${index + 1}/${actions.length}: ${action.action} on ${action.filePath}`
      );

      const actionStart = Date.now();
      const actionSuccess = await this.executeAction(action);
      const actionEnd = Date.now();

      console.log(
        `${actionSuccess ? '✅' : '❌'} Action ${index + 1} execution ${actionSuccess ? 'succeeded' : 'failed'} in ${actionEnd - actionStart}ms`
      );

      if (actionSuccess) {
        executedActions.push(action);
      } else {
        console.error(
          `❌ Action ${index + 1} (${action.action} on ${action.filePath}) failed to execute. Stopping execution.`
        );
        allActionsSuccessful = false;
        break;
      }
    }

    // Generate a summary of changes
    if (executedActions.length > 0) {
      console.log('🔄 Generating summary of changes...');
      const summary = await this.generateChangesSummary(executedActions);
      console.log(`📝 Summary generated: ${summary}`);

      // Send a final message with the summary
      await this.sendOperationUpdate('read', '', summary, 'completed');
      console.log(`✅ Sent final summary message`);

      // Preview refresh will happen automatically through polling
    } else if (!allActionsSuccessful) {
      console.log(`⚠️ Some actions failed to execute, sending error update...`);
      await this.sendOperationUpdate(
        'error',
        '',
        `I encountered some issues while making the requested changes. Please check the operation log for details.`,
        'error'
      );
      console.log(`⚠️ Error update sent`);
    }
  }

  /**
   * Log details of the pipeline result
   */
  private logPipelineResult(pipelineResult: ActionExecutionResult) {
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
  }

  /**
   * Try to revalidate the path if in a web environment
   */
  private tryRevalidatePath() {
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
  }

  /**
   * Map operation type to database operation type
   */
  private mapOperationTypeForDb(operationType: OperationType): string {
    if (operationType === 'createDir') return 'create';
    if (operationType === 'removeDir') return 'delete';
    return operationType;
  }

  /**
   * Map action to operation type
   */
  private mapActionToOperationType(action: string): OperationType {
    switch (action) {
      case 'createFile':
        return 'create';
      case 'createDirectory':
        return 'createDir';
      case 'editFile':
        return 'edit';
      case 'deleteFile':
        return 'delete';
      case 'removeDirectory':
        return 'removeDir';
      case 'search':
        return 'read';
      case 'readFile':
        return 'read';
      default:
        return 'error';
    }
  }

  /**
   * Update action status in the database
   */
  private async updateActionStatus(
    messageId: number,
    filePath: string,
    operationType: OperationType,
    status: 'completed' | 'error'
  ) {
    console.log(`📝 Updating action status to ${status} in database...`);
    const dbOperationType = this.mapOperationTypeForDb(operationType);

    await db
      .update(actions)
      .set({
        status,
        timestamp: new Date(),
      })
      .where(
        and(
          eq(actions.messageId, messageId),
          eq(actions.path, filePath),
          eq(actions.type, dbOperationType)
        )
      );
  }

  /**
   * Execute a tool based on the action type
   */
  private async executeToolAction(normalizedAction: Action, tool: unknown): Promise<boolean> {
    interface Tool {
      execute: <T>(path: string, content?: string) => Promise<T>;
    }
    const typedTool = tool as Tool;

    switch (normalizedAction.action) {
      case 'editFile':
      case 'createFile': {
        if (!normalizedAction.content) {
          console.error(`❌ Missing content for ${normalizedAction.action} action`);
          return false;
        }
        const fullPath = path.join(getProjectPath(this.projectId), normalizedAction.filePath);
        console.log(`📝 Executing ${normalizedAction.action} on full path: ${fullPath}`);
        console.log(`📝 Content length: ${normalizedAction.content.length} characters`);
        return await typedTool.execute<boolean>(fullPath, normalizedAction.content);
      }

      case 'deleteFile':
      case 'removeDirectory': {
        const deletePath = path.join(getProjectPath(this.projectId), normalizedAction.filePath);
        console.log(`📝 Executing ${normalizedAction.action} on full path: ${deletePath}`);
        return await typedTool.execute<boolean>(deletePath);
      }

      case 'createDirectory': {
        const dirPath = path.join(getProjectPath(this.projectId), normalizedAction.filePath);
        console.log(`📝 Executing ${normalizedAction.action} on full path: ${dirPath}`);
        return await typedTool.execute<boolean>(dirPath);
      }

      case 'search': {
        console.log(`📝 Executing search for: ${normalizedAction.filePath}`);
        await typedTool.execute<void>(normalizedAction.filePath);
        return true;
      }

      case 'readFile': {
        const fullPath = path.join(getProjectPath(this.projectId), normalizedAction.filePath);
        console.log(`📝 Executing read on full path: ${fullPath}`);
        await typedTool.execute<void>(fullPath);
        return true;
      }

      default:
        console.error(`❌ Unsupported action: ${normalizedAction.action}`);
        return false;
    }
  }

  /**
   * Execute read actions to gather context during thinking phase
   */
  private async executeReadActionsForContext(
    actions: Action[],
    projectId: number,
    executionLog: string[],
    gatheredContext: Record<string, string>
  ) {
    console.log(`🧠 Agent is still in thinking mode, executing read actions...`);

    for (const action of actions) {
      if (action.action === 'readFile') {
        console.log(`📖 Reading file: ${action.filePath}`);
        executionLog.push(`Read ${action.filePath}`);

        try {
          // Get the readFile tool
          const readTool = getTool('readFile');
          if (!readTool) {
            console.error(`❌ readFile tool not found`);
            continue;
          }

          // Send an update that we're reading this file
          const pendingResult = await this.sendOperationUpdate(
            'read',
            action.filePath,
            action.message,
            'pending'
          );

          // Store the message ID to update later
          const messageId = pendingResult.message?.id;

          if (!messageId) {
            console.error(`❌ Failed to create pending message for reading ${action.filePath}`);
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

              // Update the existing message's status
              await this.updateActionStatus(messageId, action.filePath, 'read', 'completed');
            } else {
              console.error(`❌ Failed to read file: ${action.filePath}`);
              gatheredContext[action.filePath] = `Error: Could not read file`;

              // Update with error status
              await this.updateActionStatus(messageId, action.filePath, 'read', 'error');
              await this.updateMessageContent(
                messageId,
                `Error reading ${action.filePath}: Could not read file`
              );
            }
          }
        } catch (error) {
          console.error(`❌ Error reading file ${action.filePath}:`, error);
          gatheredContext[action.filePath] = `Error: ${error}`;

          // Since we couldn't track the message ID in this case, create a new error message
          await this.sendOperationUpdate(
            'error',
            action.filePath,
            `Error reading ${action.filePath}: ${error}`,
            'error'
          );
        }
      }
    }
  }

  /**
   * Update context with gathered information
   */
  private updateContext(
    currentContext: string,
    gatheredContext: Record<string, string>,
    executionLog: string[]
  ): string {
    let updatedContext = currentContext;

    // Add gathered file contents to context
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

    return updatedContext;
  }

  /**
   * Update message content in the database
   */
  private async updateMessageContent(messageId: number, content: string) {
    try {
      await db
        .update(chatMessages)
        .set({
          content,
          timestamp: new Date(),
        })
        .where(eq(chatMessages.id, messageId));
      console.log(`✅ Updated message ${messageId} content: ${content.substring(0, 50)}...`);
    } catch (error) {
      console.error(`❌ Error updating message content:`, error);
    }
  }

  /**
   * Fetch chat history for the project
   */
  private async fetchChatHistory(
    projectId: number
  ): Promise<{ role: 'system' | 'user' | 'assistant'; content: string }[]> {
    try {
      console.log(`🔍 Fetching chat history for project ID: ${projectId}`);

      // Fetch the most recent messages (limited to prevent context size issues)
      const history = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.projectId, projectId))
        .orderBy(chatMessages.timestamp)
        .limit(LLM.MAX_MESSAGES);

      console.log(`✅ Retrieved ${history.length} chat messages`);

      // Format messages for the prompt
      return history.map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content,
      }));
    } catch (error) {
      console.error(`❌ Error fetching chat history:`, error);
      return []; // Return empty array if there's an error
    }
  }
}
