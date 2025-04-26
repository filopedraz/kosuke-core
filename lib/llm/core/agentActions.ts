import path from 'path';
import { Action, normalizeAction } from './types';
import { getProjectPath } from '@/lib/fs/operations';
import { getTool } from '../tools';
import {
  mapActionToOperationType,
  sendOperationUpdate,
  updateActionStatus,
  updateMessageContent,
} from './agentCommunication';

/**
 * Execute a single action
 */
export async function executeAction(projectId: number, action: Action): Promise<boolean> {
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
      await sendOperationUpdate(
        projectId,
        'error',
        action.filePath,
        `Error: Unknown action '${action.action}'`,
        'error'
      );
      return false;
    }

    // Map action type to operation type
    const operationType = mapActionToOperationType(normalizedAction.action);

    // Send an update about the operation we're about to perform with pending status
    console.log(
      `📝 Sending operation update for ${operationType} ${normalizedAction.filePath} (pending)...`
    );
    const result = await sendOperationUpdate(
      projectId,
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
      const success = await executeToolAction(projectId, normalizedAction, tool);

      if (!success) {
        console.error(`❌ Failed to ${normalizedAction.action} on: ${normalizedAction.filePath}`);
        await updateActionStatus(messageId, normalizedAction.filePath, operationType, 'error');
        // Update the message content to indicate failure
        await updateMessageContent(
          messageId,
          `Error: Failed to ${normalizedAction.action} on ${normalizedAction.filePath}`
        );
        return false;
      }

      // Update operation status to completed after successful execution
      await updateActionStatus(messageId, normalizedAction.filePath, operationType, 'completed');
      console.log(
        `✅ Updated operation status to completed: ${operationType} ${normalizedAction.filePath}`
      );

      // Keep the original message from the LLM without appending completion status
      return true;
    } catch (error) {
      console.error(`❌ Error executing action:`, error);
      // Update the operation status to error
      await updateActionStatus(messageId, normalizedAction.filePath, operationType, 'error');
      // Update the message content to indicate error
      await updateMessageContent(
        messageId,
        `Error: Failed to ${normalizedAction.action} on ${normalizedAction.filePath}: ${(error as Error).message}`
      );
      return false;
    }
  } catch (error) {
    console.error(`❌ Error in executeAction:`, error);
    await sendOperationUpdate(
      projectId,
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
export async function executeActions(
  projectId: number,
  actions: Action[],
  generateChangesSummary: (actions: Action[]) => Promise<string>
) {
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
    const actionSuccess = await executeAction(projectId, action);
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
    const summary = await generateChangesSummary(executedActions);
    console.log(`📝 Summary generated: ${summary}`);

    // Send a final message with the summary
    await sendOperationUpdate(projectId, 'read', '', summary, 'completed');
    console.log(`✅ Sent final summary message`);

    // Preview refresh will happen automatically through polling
  } else if (!allActionsSuccessful) {
    console.log(`⚠️ Some actions failed to execute, sending error update...`);
    await sendOperationUpdate(
      projectId,
      'error',
      '',
      `I encountered some issues while making the requested changes. Please check the operation log for details.`,
      'error'
    );
    console.log(`⚠️ Error update sent`);
  }
}

/**
 * Execute a tool based on the action type
 */
export async function executeToolAction(
  projectId: number,
  normalizedAction: Action,
  tool: unknown
): Promise<boolean> {
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
      const fullPath = path.join(getProjectPath(projectId), normalizedAction.filePath);
      console.log(`📝 Executing ${normalizedAction.action} on full path: ${fullPath}`);
      console.log(`📝 Content length: ${normalizedAction.content.length} characters`);
      return await typedTool.execute<boolean>(fullPath, normalizedAction.content);
    }

    case 'deleteFile':
    case 'removeDirectory': {
      const deletePath = path.join(getProjectPath(projectId), normalizedAction.filePath);
      console.log(`📝 Executing ${normalizedAction.action} on full path: ${deletePath}`);
      return await typedTool.execute<boolean>(deletePath);
    }

    case 'createDirectory': {
      const dirPath = path.join(getProjectPath(projectId), normalizedAction.filePath);
      console.log(`📝 Executing ${normalizedAction.action} on full path: ${dirPath}`);
      return await typedTool.execute<boolean>(dirPath);
    }

    case 'search': {
      console.log(`📝 Executing search for: ${normalizedAction.filePath}`);
      await typedTool.execute<void>(normalizedAction.filePath);
      return true;
    }

    case 'readFile': {
      const fullPath = path.join(getProjectPath(projectId), normalizedAction.filePath);
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
export async function executeReadActionsForContext(
  actions: Action[],
  projectId: number,
  executionLog: string[],
  gatheredContext: Record<string, string>,
  readFiles: Set<string> // Track files that have been read
) {
  console.log(`🧠 Agent is still in thinking mode, executing read actions...`);
  const { countTokens } = await import('../context');

  // Filter actions to only include read actions
  const readActions = actions.filter(action => action.action === 'readFile');
  if (readActions.length === 0) {
    console.log('No read actions to execute');
    return;
  }

  // Get current context size from the latest message
  const { db } = await import('@/lib/db/drizzle');
  const { chatMessages } = await import('@/lib/db/schema');
  const { eq, desc } = await import('drizzle-orm');

  const latestMessages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.projectId, projectId))
    .orderBy(desc(chatMessages.timestamp))
    .limit(1);

  let currentContextSize =
    latestMessages.length > 0 && latestMessages[0].contextTokens
      ? latestMessages[0].contextTokens
      : 0;

  // Get current token totals
  const { sql } = await import('drizzle-orm');
  const tokenTotals = await db
    .select({
      totalInput: sql`SUM(tokens_input)`,
      totalOutput: sql`SUM(tokens_output)`,
    })
    .from(chatMessages)
    .where(eq(chatMessages.projectId, projectId));

  let totalTokensInput = Number(tokenTotals[0]?.totalInput || 0);

  // Get the readFile tool once for all read actions
  const readTool = getTool('readFile');
  if (!readTool) {
    console.error(`❌ readFile tool not found`);
    return;
  }

  for (const action of readActions) {
    console.log(`📖 Reading file: ${action.filePath}`);
    executionLog.push(`Read ${action.filePath}`);

    // Skip already read files
    if (readFiles.has(action.filePath)) {
      console.warn(`⚠️ Skip reading already read file: ${action.filePath}`);
      continue;
    }

    // Track this file as being read
    readFiles.add(action.filePath);

    try {
      // Send an update that we're reading this file
      const pendingResult = await sendOperationUpdate(
        projectId,
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
          const fileContent = result.content as string;

          // Count tokens in the file content
          const fileTokens = countTokens(fileContent);

          // Update context size - this adds to the current context window
          currentContextSize += fileTokens;

          // Update total tokens input - file content is sent to the LLM
          totalTokensInput += fileTokens;

          // Log the current context size
          console.log(
            `📊 Current context size: ${currentContextSize} tokens (added ${fileTokens} tokens from ${action.filePath})`
          );
          console.log(`📊 Total tokens input: ${totalTokensInput} tokens`);

          // Update the database to reflect the new context size for the current request
          // and add the file tokens to tokensInput since they're sent to the LLM
          await db
            .update(chatMessages)
            .set({
              contextTokens: currentContextSize,
              tokensInput: fileTokens, // Count file tokens as input tokens
            })
            .where(eq(chatMessages.id, messageId));

          // Store the file content in gathered context
          gatheredContext[action.filePath] = fileContent;
          console.log(`✅ Successfully read file: ${action.filePath} (${fileTokens} tokens)`);

          // Update the existing message's status
          await updateActionStatus(messageId, action.filePath, 'read', 'completed');
        } else {
          console.error(`❌ Failed to read file: ${action.filePath}`);
          gatheredContext[action.filePath] = `Error: Could not read file`;

          // Update with error status
          await updateActionStatus(messageId, action.filePath, 'read', 'error');
          await updateMessageContent(
            messageId,
            `Error reading ${action.filePath}: Could not read file`
          );
        }
      }
    } catch (error) {
      console.error(`❌ Error reading file ${action.filePath}:`, error);
      gatheredContext[action.filePath] = `Error: ${error}`;

      // Since we couldn't track the message ID in this case, create a new error message
      await sendOperationUpdate(
        projectId,
        'error',
        action.filePath,
        `Error reading ${action.filePath}: ${error}`,
        'error'
      );
    }
  }
}

/**
 * Update context with gathered information
 */
export function updateContext(
  currentContext: string,
  gatheredContext: Record<string, string>,
  executionLog: string[]
): string {
  // Remove any previous "File Contents" and "Execution Log" sections
  let cleanContext = currentContext.replace(/\n\n### File Contents:[\s\S]*?(?=\n\n### |$)/, '');
  cleanContext = cleanContext.replace(/\n\n### Execution Log:[\s\S]*?(?=\n\n### |$)/, '');
  cleanContext = cleanContext.trim();

  let updatedContext = cleanContext;

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
 * Update context with tracking information for already read files and iteration warnings
 */
export function updateContextWithTracking(
  currentContext: string,
  readFiles: Set<string>,
  iterationCount: number,
  maxIterations: number
): string {
  let updatedContext = currentContext;

  // Add read files tracking to the context
  if (readFiles.size > 0) {
    const filesReadSection = `\n\n### Already Read Files - DO NOT READ THESE AGAIN:\n${Array.from(
      readFiles
    )
      .map((file, i) => `${i + 1}. ${file}`)
      .join('\n')}\n`;

    updatedContext = addAlreadyReadFilesSection(updatedContext, filesReadSection);
  }

  // Add iteration limit warning if approaching max
  if (iterationCount >= Math.floor(maxIterations * 0.6)) {
    const warningMsg = `\n\n### WARNING - APPROACHING ITERATION LIMIT:\nYou have used ${iterationCount} of ${maxIterations} available iterations. Move to implementation phase soon to avoid termination.\n`;
    updatedContext = addWarningSection(updatedContext, warningMsg);
  }

  return updatedContext;
}

/**
 * Add already read files section to the context
 */
export function addAlreadyReadFilesSection(context: string, filesReadSection: string): string {
  return addSectionToContext(
    context,
    filesReadSection,
    '### Already Read Files - DO NOT READ THESE AGAIN:'
  );
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
