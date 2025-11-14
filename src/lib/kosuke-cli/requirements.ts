import 'server-only';

/**
 * Kosuke CLI Requirements Integration
 * Server-side wrapper for @kosuke-ai/cli requirements gathering
 */

interface RequirementsOptions {
  projectPath: string;
  projectId: string;
  userMessage: string;
  existingDocs?: string;
  onUpdate?: (docs: string) => Promise<void>;
}

interface RequirementsResult {
  success: boolean;
  docs?: string;
  error?: string;
  tokenUsage?: {
    input: number;
    output: number;
  };
}

/**
 * Run requirements gathering using Kosuke CLI
 * This function is called from the API route with user messages
 */
async function _runRequirementsGathering(
  _options: RequirementsOptions
): Promise<RequirementsResult> {
  try {
    // Validate ANTHROPIC_API_KEY is present
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }

    // TODO: Implement the actual integration once we have access to the CLI
    // The CLI is designed for interactive terminal use, so we'll need to:
    // 1. Extract the core logic
    // 2. Make it work programmatically
    // 3. Return the docs.md content

    try {
      // Import kosuke CLI - this will work when locally mounted via docker-compose
      // @ts-expect-error - Package may not be installed during development
      const { requirementsCommand } = await import('@kosuke-ai/cli');
      console.log('Kosuke CLI loaded successfully:', requirementsCommand);

      // TODO: Call the CLI with proper parameters once we understand the API
      return {
        success: false,
        error: 'Kosuke CLI integration in progress - CLI loaded but integration not complete',
      };
    } catch (importError) {
      console.warn('Kosuke CLI not available:', importError);
      return {
        success: false,
        error:
          'Kosuke CLI not available. Mount local CLI via docker-compose.local.yml or install package.',
      };
    }
  } catch (error) {
    console.error('Error running requirements gathering:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Initialize docs.md file in the repository
 */
export async function initializeDocsFile(projectPath: string): Promise<boolean> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    const docsPath = path.join(projectPath, 'docs.md');

    // Check if file already exists
    try {
      await fs.access(docsPath);
      return true; // File already exists
    } catch {
      // File doesn't exist, create it
      await fs.writeFile(
        docsPath,
        `# Project Requirements\n\n*This document will be populated through our AI-powered requirements gathering process.*\n`,
        'utf-8'
      );
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
