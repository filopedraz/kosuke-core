import { eq, and, desc, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/drizzle';
import { chatMessages, actions } from '@/lib/db/schema';
import { isWebRequestEnvironment } from '@/lib/environment';
import { AgentErrorType } from './types';
import { Action } from './types';
import { generateSummaryWithFlash } from '../api/ai';

// Action operation type mapping for database operations
export type OperationType =
  | 'create'
  | 'edit'
  | 'delete'
  | 'error'
  | 'read'
  | 'createDir'
  | 'removeDir';

/**
 * Generate a summary of changes made to the project
 */
export async function generateChangesSummary(actions: Action[]): Promise<string> {
  try {
    // Filter out readFile actions as they don't represent actual changes
    const changeActions = actions.filter(a => a.action !== 'readFile');

    // Group actions by type
    const createdFiles = changeActions.filter(a => a.action === 'createFile').map(a => a.filePath);
    const editedFiles = changeActions.filter(a => a.action === 'editFile').map(a => a.filePath);
    const deletedFiles = changeActions.filter(a => a.action === 'deleteFile').map(a => a.filePath);

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
export async function sendOperationUpdate(
  projectId: number,
  operationType: OperationType,
  filePath: string,
  operationMessage: string,
  status: 'pending' | 'completed' | 'error' = 'completed',
  errorType?: AgentErrorType
) {
  try {
    console.log(
      `📝 Sending operation update: ${operationType} ${filePath} (${status}): ${operationMessage.substring(0, 50)}...`
    );

    // Count tokens for this message
    const { countTokens } = await import('../context');
    const messageTokensOutput = countTokens(operationMessage);

    // Calculate cumulative token totals
    const tokenTotals = await db
      .select({
        totalInput: sql`SUM(tokens_input)`,
        totalOutput: sql`SUM(tokens_output)`,
      })
      .from(chatMessages)
      .where(eq(chatMessages.projectId, projectId));

    // Use totals or default to 0 if null
    const totalTokensOutput = Number(tokenTotals[0]?.totalOutput || 0) + messageTokensOutput;

    // Get current context from most recent message for this request
    const latestMessages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.projectId, projectId))
      .orderBy(desc(chatMessages.timestamp))
      .limit(1);

    const currentContextSize =
      latestMessages.length > 0 && latestMessages[0].contextTokens
        ? latestMessages[0].contextTokens
        : 0;

    // Always create a new message for each operation update to provide real-time feedback
    console.log(`📝 Creating new message for operation update...`);

    // Create the insert values - use a specific type based on schema
    const insertValues: {
      projectId: number;
      content: string;
      role: string;
      tokensInput: number;
      tokensOutput: number;
      contextTokens: number;
      metadata?: string;
    } = {
      projectId: projectId,
      content: operationMessage,
      role: 'assistant',
      tokensInput: 0, // No additional input tokens for assistant messages
      tokensOutput: messageTokensOutput, // Tokens in this message
      contextTokens: currentContextSize, // Maintain the current context size
    };

    // Add metadata if we have an error type and the schema supports it
    if (errorType) {
      // Add metadata field - we'll handle any errors from the database
      insertValues.metadata = JSON.stringify({ errorType });
    }

    const [newMessage] = await db.insert(chatMessages).values(insertValues).returning();

    const messageId = newMessage.id;
    console.log(`✅ Created new assistant message: ${messageId} for operation`);
    console.log(`📊 Total tokens output (including this message): ${totalTokensOutput}`);

    // Map operationType to proper type for database
    const dbOperationType = mapOperationTypeForDb(operationType);

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
    tryRevalidatePath(projectId);

    // Preview refresh will happen automatically through polling mechanism

    return {
      success: true,
      message: {
        id: messageId,
        content: operationMessage,
        role: 'assistant',
        tokensOutput: messageTokensOutput,
        contextTokens: currentContextSize,
        totalTokensOutput,
        errorType, // Include error type in the return value
      },
    };
  } catch (error) {
    console.error(`❌ Error sending operation update:`, error);
    return { success: false, error: 'Failed to send operation update' };
  }
}

/**
 * Map operation type to database operation type
 */
export function mapOperationTypeForDb(operationType: OperationType): string {
  if (operationType === 'createDir') return 'create';
  if (operationType === 'removeDir') return 'delete';
  return operationType;
}

/**
 * Map action to operation type
 */
export function mapActionToOperationType(action: string): OperationType {
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
export async function updateActionStatus(
  messageId: number,
  filePath: string,
  operationType: OperationType,
  status: 'completed' | 'error'
) {
  console.log(`📝 Updating action status to ${status} in database...`);
  const dbOperationType = mapOperationTypeForDb(operationType);

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
 * Update message content in the database
 */
export async function updateMessageContent(messageId: number, content: string) {
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
export async function fetchChatHistory(
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
      .limit(100); // Using a constant value for now

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

/**
 * Try to revalidate the path if in a web environment
 */
export function tryRevalidatePath(projectId: number) {
  if (isWebRequestEnvironment()) {
    try {
      revalidatePath(`/projects/${projectId}`);
    } catch (revalidateError) {
      console.warn(`⚠️ Could not revalidate path: ${revalidateError}`);
      // Don't fail the operation just because revalidation failed
    }
  } else {
    console.log(`🔍 Skipping revalidatePath in script context`);
  }
}
