import type Anthropic from '@anthropic-ai/sdk';
import 'server-only';

/**
 * Kosuke CLI Requirements Integration
 * Server-side wrapper for @kosuke-ai/cli requirements gathering
 */

interface RequirementsOptions {
  projectPath: string;
  projectId: string;
  projectName: string;
  userMessage: string;
  previousMessages?: Anthropic.MessageParam[]; // Full conversation history in Anthropic format
  isFirstRequest?: boolean;
  onStream?: (text: string) => void;
}

interface RequirementsResult {
  success: boolean;
  response: string;
  messages: Anthropic.MessageParam[]; // Updated message history after this interaction
  docs?: string;
  error?: string;
  tokenUsage?: {
    input: number;
    output: number;
    cacheCreation: number;
    cacheRead: number;
  };
}

// Type definition for kosuke-cli requirementsCore function
interface KosukeCoreModule {
  requirementsCore?: (options: {
    workspaceRoot: string;
    userMessage: string;
    previousMessages?: Anthropic.MessageParam[];
    isFirstRequest?: boolean;
    onStream?: (text: string) => void;
  }) => Promise<{
    success: boolean;
    response: string;
    messages: Anthropic.MessageParam[]; // Full message history
    docsCreated: boolean;
    docsContent?: string;
    tokenUsage: {
      input: number;
      output: number;
      cacheCreation: number;
      cacheRead: number;
    };
    error?: string;
  }>;
}

/**
 * Run requirements gathering using Kosuke CLI requirementsCore
 * This function is called from the API route with user messages
 */
export async function runRequirementsGathering(
  options: RequirementsOptions
): Promise<RequirementsResult> {
  const {
    projectPath,
    userMessage,
    previousMessages = [],
    isFirstRequest = false,
    onStream,
  } = options;

  console.log(`🔍 [Requirements] Previous messages: ${previousMessages.length}`);
  console.log(`🔍 [Requirements] Is first request: ${isFirstRequest}`);

  try {
    // Debug logging for environment
    console.log('🔍 [Requirements] process.env.PATH:', process.env.PATH);
    console.log('🔍 [Requirements] Current working directory:', process.cwd());

    // Ensure PATH is set in environment (fix for Docker spawn issues)
    if (!process.env.PATH) {
      console.warn('⚠️ [Requirements] PATH not set, adding default');
      process.env.PATH = '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin';
    }

    // Import requirementsCore from kosuke-cli
    // Note: TypeScript may not recognize this locally, but it exists in the Docker-mounted volume
    const kosukeModule = (await import('@kosuke-ai/cli')) as KosukeCoreModule;
    const requirementsCore = kosukeModule.requirementsCore;

    console.log('✅ [Requirements] requirementsCore loaded successfully');

    if (!requirementsCore) {
      throw new Error(
        'requirementsCore not found in kosuke-cli. Ensure kosuke-cli is built and mounted correctly.'
      );
    }

    // Call requirementsCore with proper options
    const result = await requirementsCore({
      workspaceRoot: projectPath,
      userMessage,
      previousMessages,
      isFirstRequest,
      onStream,
    });

    if (!result.success) {
      throw new Error(result.error || 'Requirements gathering failed');
    }

    return {
      success: true,
      response: result.response,
      messages: result.messages, // Return updated message history
      docs: result.docsContent,
      tokenUsage: {
        input: result.tokenUsage.input,
        output: result.tokenUsage.output,
        cacheCreation: result.tokenUsage.cacheCreation,
        cacheRead: result.tokenUsage.cacheRead,
      },
    };
  } catch (error) {
    console.error('Error running requirements gathering:', error);
    return {
      success: false,
      response: '',
      messages: previousMessages, // Return original messages on error
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Initialize docs.md file in the repository
 * This should only be called during requirements gathering, not project creation
 */
async function _initializeDocsFile(projectPath: string, initialContent?: string): Promise<boolean> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    const docsPath = path.join(projectPath, 'docs.md');

    // Check if file already exists
    try {
      await fs.access(docsPath);
      return true; // File already exists
    } catch {
      // File doesn't exist, create it with provided content or default
      const content =
        initialContent ||
        `# Project Requirements\n\n*Generated through AI-powered requirements gathering.*\n`;
      await fs.writeFile(docsPath, content, 'utf-8');
      return true;
    }
  } catch (error) {
    console.error('Error initializing docs.md:', error);
    return false;
  }
}

/**
 * Read current docs.md content
 */
async function _readDocsFile(projectPath: string): Promise<string | null> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    const docsPath = path.join(projectPath, 'docs.md');
    const content = await fs.readFile(docsPath, 'utf-8');
    return content;
  } catch (error) {
    console.error('Error reading docs.md:', error);
    return null;
  }
}

/**
 * Update docs.md content
 */
async function _updateDocsFile(projectPath: string, content: string): Promise<boolean> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    const docsPath = path.join(projectPath, 'docs.md');
    await fs.writeFile(docsPath, content, 'utf-8');
    return true;
  } catch (error) {
    console.error('Error updating docs.md:', error);
    return false;
  }
}
