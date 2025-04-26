import { LLM, CONTEXT } from '@/lib/constants';
import { Action } from './agentActions';
import { AgentErrorType } from './agentError';
import { getProjectContextWithDirectoryStructureAndAnalysis } from '../context';
import {
  generateChangesSummary,
  fetchChatHistory,
  sendOperationUpdate,
  tryRevalidatePath,
} from './agentCommunication';
import { AgentError, classifyError, getErrorMessage } from './agentError';
import {
  executeActions,
  updateContext,
  updateContextWithTracking,
  executeReadActionsForContext,
} from './agentActions';
import { generateAndParseAgentResponse, forceExecutionMode } from './agentPromptParser';

type ActionExecutionResult = {
  success: boolean;
  error?: string;
  errorType?: AgentErrorType;
  errorDetails?: string;
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
  async run(prompt: string): Promise<{
    success: boolean;
    error?: string;
    errorType?: string;
    errorDetails?: string;
  }> {
    console.log(`🤖 Processing modification request for project ID: ${this.projectId}`);
    const processingStart = Date.now();

    try {
      // Create timeout promise for safety
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            new AgentError({
              type: 'timeout',
              message: 'Processing timeout exceeded',
            })
          );
        }, LLM.PROCESSING_TIMEOUT);
      });

      try {
        // Get context and run the agent to get actions
        let context = '';
        try {
          console.log(`🔍 Getting project context for projectId: ${this.projectId}`);
          context = await getProjectContextWithDirectoryStructureAndAnalysis(this.projectId, {
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
          await executeActions(this.projectId, pipelineResult.actions, generateChangesSummary);
        } else {
          console.warn(
            `⚠️ No actions returned from pipeline. Pipeline result: ${JSON.stringify(pipelineResult)}`
          );

          // Send error with specific error type
          await sendOperationUpdate(
            this.projectId,
            'error',
            '',
            `I was unable to understand how to make the requested changes. Please try rephrasing your request.`,
            'error',
            pipelineResult.errorType || ('unknown' as AgentErrorType)
          );

          // Return error with type information
          return {
            success: false,
            error: pipelineResult.error || 'No actions returned from pipeline',
            errorType: pipelineResult.errorType || 'processing',
            errorDetails: pipelineResult.errorDetails,
          };
        }
      } catch (error) {
        // Handle error during processing
        console.error('❌ Error or timeout processing modification:', error);

        // Determine error type
        const errorType = classifyError(error);
        const errorMessage = getErrorMessage(error, errorType);

        await sendOperationUpdate(this.projectId, 'error', '', errorMessage, 'error', errorType);

        return {
          success: false,
          error: errorMessage,
          errorType,
          errorDetails: error instanceof Error ? error.stack : undefined,
        };
      }

      // Revalidate path if in web environment
      tryRevalidatePath(this.projectId);

      const processingEnd = Date.now();
      console.log(`⏱️ Total processing time: ${processingEnd - processingStart}ms`);

      return { success: true };
    } catch (error) {
      console.error(`❌ Error in Agent.run:`, error);

      // Classify the error
      const errorType = classifyError(error);
      const errorMessage = getErrorMessage(error, errorType);

      return {
        success: false,
        error: errorMessage,
        errorType,
        errorDetails: error instanceof Error ? error.stack : undefined,
      };
    }
  }

  /**
   * Run the agentic workflow where the model can iteratively read files and gather context
   *
   * This method orchestrates the agent's thinking process:
   * 1. Iteratively gathers context by reading files
   * 2. Tracks files that have been read to avoid duplicates
   * 3. Monitors iteration count to prevent infinite loops
   * 4. Handles the transition from thinking to execution mode
   *
   * @param projectId - The ID of the current project
   * @param prompt - The user's original request prompt
   * @param context - Initial context for the agent
   * @returns A result object with actions to execute or an error
   */
  private async runAgentic(
    projectId: number,
    prompt: string,
    context: string
  ): Promise<ActionExecutionResult> {
    console.log(`🔄 Running agentic workflow for project ID: ${projectId}`);

    const isThinking = true; // This is only used for the initial loop condition
    const executionLog: string[] = [];
    const gatheredContext: Record<string, string> = {};
    const readFiles = new Set<string>(); // Track unique files that have been read
    let iterationCount = 0;

    try {
      // Fetch chat history for context
      const chatHistory = await fetchChatHistory(projectId);
      console.log(`📝 Fetched ${chatHistory.length} previous chat messages for context`);

      // Initial context
      let currentContext = context;

      // Iterative loop for agentic behavior
      while (isThinking && iterationCount < this.MAX_ITERATIONS) {
        iterationCount++;
        console.log(`🔄 Starting iteration ${iterationCount} of agentic workflow`);

        try {
          // Send a "Thinking..." message before each AI completion call
          await sendOperationUpdate(this.projectId, 'read', '', 'Thinking...', 'pending');

          // Update context with read files tracking and iteration warnings
          currentContext = updateContextWithTracking(
            currentContext,
            readFiles,
            iterationCount,
            this.MAX_ITERATIONS
          );

          // Generate and parse AI response
          const actions = await generateAndParseAgentResponse(
            prompt,
            currentContext,
            chatHistory,
            this.DEFAULT_TIMEOUT_MS,
            this.DEFAULT_MAX_TOKENS
          );

          // Process the parsed response
          if (!actions.thinking) {
            // Agent is ready to execute changes
            console.log(
              `✅ Agent is ready to execute changes, found ${actions.actions.length} actions`
            );

            return {
              success: true,
              actions: actions.actions,
            };
          }

          // Check for duplicate read requests and potentially force execution mode
          if (await this.shouldForceExecution(actions.actions, readFiles, iterationCount)) {
            // Force execution mode with one final attempt
            const finalActions = await forceExecutionMode(
              prompt,
              currentContext,
              chatHistory,
              this.DEFAULT_TIMEOUT_MS,
              this.DEFAULT_MAX_TOKENS
            );

            return {
              success: true,
              actions: finalActions,
            };
          }

          // Execute read actions to gather more context
          await executeReadActionsForContext(
            actions.actions,
            projectId,
            executionLog,
            gatheredContext,
            readFiles
          );

          // Update context with gathered information
          currentContext = updateContext(currentContext, gatheredContext, executionLog);
        } catch (iterationError) {
          console.error(`❌ Error in iteration ${iterationCount}:`, iterationError);

          // Add error information to the context
          const errorMsg = `\n\n### ERROR IN PREVIOUS ITERATION:\n${iterationError}\n\nPlease try a different approach.\n`;
          const addSectionToContext = (await import('./agentPromptParser')).addSectionToContext;
          currentContext = addSectionToContext(
            currentContext,
            errorMsg,
            '### ERROR IN PREVIOUS ITERATION:'
          );

          // Continue to next iteration unless we're at the limit
          if (iterationCount >= this.MAX_ITERATIONS - 1) {
            throw iterationError;
          }
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
    } catch (error) {
      console.error(`❌ Error in runAgentic:`, error);
      return {
        success: false,
        error: `Error in agentic workflow: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Determine if we should force the agent into execution mode based on read actions
   */
  private async shouldForceExecution(
    actions: Action[],
    readFiles: Set<string>,
    iterationCount: number
  ): Promise<boolean> {
    // Check for duplicate read requests
    const duplicateReads = actions
      .filter(a => a.action === 'readFile' && readFiles.has(a.filePath))
      .map(a => a.filePath);

    if (duplicateReads.length > 0) {
      console.warn(`⚠️ Agent is trying to reread files: ${duplicateReads.join(', ')}`);

      // Force execution mode if too many duplicates or too many iterations
      return duplicateReads.length >= 3 || iterationCount >= Math.floor(this.MAX_ITERATIONS * 0.8);
    }

    return false;
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
}
