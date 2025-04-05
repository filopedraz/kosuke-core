import { eq, and, desc } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

// Import project components
import { db } from '../lib/db/drizzle';
import { users, chatMessages, actions } from '../lib/db/schema';
import { createProject as dbCreateProject } from '../lib/db/projects';
import { Agent } from '../lib/llm/core/agent';
import { PipelineType } from '../lib/llm/pipelines/types';
import { getProjectPath, listFilesRecursively } from '../lib/fs/operations';
import { scaffoldProject } from '../lib/fs/scaffold';

/**
 * Debug logger function that provides timestamps and colors
 */
const debug = {
  log: (message: string, ...args: unknown[]) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`[${timestamp}] ${message}`, ...args);
  },
  info: (message: string, ...args: unknown[]) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`[${timestamp}] ℹ️ ${message}`, ...args);
  },
  success: (message: string, ...args: unknown[]) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`[${timestamp}] ✅ ${message}`, ...args);
  },
  warn: (message: string, ...args: unknown[]) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.warn(`[${timestamp}] ⚠️ ${message}`, ...args);
  },
  error: (message: string, ...args: unknown[]) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.error(`[${timestamp}] ❌ ${message}`, ...args);
  },
  pipeline: (message: string, ...args: unknown[]) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`[${timestamp}] 🚀 PIPELINE: ${message}`, ...args);
  },
};

/**
 * This script tests the naive pipeline end-to-end by:
 * 1. Finding the admin@example.com user
 * 2. Creating a test project for the user (including scaffolding)
 * 3. Triggering the naive pipeline with a test prompt
 * 4. Directly validating file creation
 */
async function main() {
  try {
    debug.log('🚀 Starting end-to-end test of naive pipeline...');

    // 1. Find the admin user
    debug.log('🔍 Looking for admin@example.com user...');
    const [adminUser] = await db.select().from(users).where(eq(users.email, 'admin@example.com'));

    if (!adminUser) {
      debug.error('Admin user not found. Please run the seed script first with: npm run db:seed');
      process.exit(1);
    }

    debug.success(`Found admin user with ID: ${adminUser.id}`);

    // 2. Create a test project
    const testProjectName = `Test Project ${new Date().toISOString()}`;
    debug.log(`📁 Creating test project: ${testProjectName}...`);

    // First create the project in the database
    debug.info('Creating project in database...');
    const project = await dbCreateProject({
      name: testProjectName,
      description: 'Automated test project for testing the naive pipeline',
      userId: adminUser.id,
      createdBy: adminUser.id,
    });

    debug.success(`Created project in database with ID: ${project.id}`);

    // Then scaffold the project like the real application would
    debug.info('Scaffolding project files...');
    try {
      await scaffoldProject(project.id, testProjectName, {
        additionalDependencies: {},
      });
      debug.success('Project scaffolding completed');
    } catch (scaffoldError) {
      debug.error('Error scaffolding project:', scaffoldError);
      process.exit(1);
    }

    // List files in the project directory to verify scaffolding
    const initialProjectDirPath = getProjectPath(project.id);
    try {
      debug.info('Verifying initial scaffolded files...');
      const initialFiles = await listFilesRecursively(initialProjectDirPath);
      debug.success(`Initial project has ${initialFiles.length} files from template`);

      // Log a few key initial files for verification
      const keyInitialFiles = initialFiles.filter(file => {
        return (
          file.endsWith('package.json') ||
          file.endsWith('next.config.js') ||
          file.endsWith('README.md')
        );
      });
      debug.info('Key initial files:', keyInitialFiles);
    } catch (listError) {
      debug.warn('Could not list initial files:', listError);
    }

    // 3. Create a test prompt
    const testPrompt =
      "Change the home page to display a big 'Hello World' in the middle of the page.";
    debug.log(`💬 Using test prompt: "${testPrompt}"`);

    // First create a system message to establish context
    debug.info('Creating initial system message for context...');
    await db.insert(chatMessages).values({
      projectId: project.id,
      role: 'system',
      content: 'Project created successfully. Help me build this project.',
    });

    // Then save the user message to the database
    debug.info('Saving user message to database...');
    const [userMessage] = await db
      .insert(chatMessages)
      .values({
        projectId: project.id,
        userId: adminUser.id,
        content: testPrompt,
        role: 'user',
        modelType: 'premium',
      })
      .returning();

    debug.success(`Saved user message with ID: ${userMessage.id}`);

    // 4. Trigger the naive pipeline
    debug.pipeline('Initializing naive pipeline agent...');
    const agent = new Agent(project.id, PipelineType.NAIVE);

    debug.pipeline('Running agent with prompt...');

    // Print environment info for API keys
    debug.info('Environment info for debugging:');
    const apiKeys = {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Set' : 'Not set',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'Set' : 'Not set',
      GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'Set' : 'Not set',
    };
    debug.info('API keys status:', apiKeys);

    // Start pipeline execution with timeout monitoring
    const startTime = Date.now();
    const result = await agent.run(testPrompt);
    const endTime = Date.now();
    debug.success(
      `Agent run completed in ${(endTime - startTime) / 1000}s with result: ${JSON.stringify(result)}`
    );

    // Long wait time to ensure all file operations are complete
    debug.info('Waiting for file operations to complete (30 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 30000));

    // 5. Check for actions in the database
    debug.log('📝 Checking for actions in the database...');

    // Get assistant message ID
    const assistantMessages = await db
      .select()
      .from(chatMessages)
      .where(and(eq(chatMessages.projectId, project.id), eq(chatMessages.role, 'assistant')))
      .orderBy(desc(chatMessages.timestamp))
      .limit(1);

    if (assistantMessages.length === 0) {
      debug.error('No assistant message found in database!');
    } else {
      const assistantMessage = assistantMessages[0];
      debug.success(`Found assistant message with ID: ${assistantMessage.id}`);
      // Show more of the assistant's response for better debugging
      debug.info(`Assistant response: ${assistantMessage.content.substring(0, 300)}...`);
      debug.info(`Full response character length: ${assistantMessage.content.length}`);

      // Get actions associated with this message
      const dbActions = await db
        .select()
        .from(actions)
        .where(eq(actions.messageId, assistantMessage.id));

      debug.info(
        `Found ${dbActions.length} actions in the database for message ID ${assistantMessage.id}:`
      );
      dbActions.forEach((action, index) => {
        debug.info(`  - ${index + 1}. ${action.type}: ${action.path} (${action.status})`);
      });

      // Count actions by status
      const completedCount = dbActions.filter(a => a.status === 'completed').length;
      const pendingCount = dbActions.filter(a => a.status === 'pending').length;
      const errorCount = dbActions.filter(a => a.status === 'error').length;

      debug.info(
        `Action status summary: ${completedCount} completed, ${pendingCount} pending, ${errorCount} error`
      );

      // List any error actions
      if (errorCount > 0) {
        debug.warn('Error actions:');
        dbActions
          .filter(a => a.status === 'error')
          .forEach(action => {
            debug.warn(`  - ${action.type}: ${action.path}`);
          });
      }
    }

    // 6. Directly check the file system to validate file creation
    debug.log('\n📁 Checking files created in the project directory...');
    const projectDirPath = getProjectPath(project.id);

    // List directories first to understand structure
    debug.info('Project directory structure:');
    try {
      const dirContents = execSync(`find ${projectDirPath} -type d | sort`).toString();
      debug.info('Directories:\n' + dirContents);
    } catch (execError) {
      debug.error('Error listing directories:', execError);
    }

    let files: string[] = [];
    try {
      // Get recursive list of files
      files = await listFilesRecursively(projectDirPath);
      debug.info(`Found ${files.length} files in project directory`);

      // Find files created/modified after scaffolding
      const newOrModifiedFiles = files.filter(file => {
        // Skip common template files that were part of initial scaffolding
        return (
          !file.includes('node_modules') &&
          !file.endsWith('.gitignore') &&
          !file.endsWith('tsconfig.json') &&
          !file.endsWith('package.json')
        );
      });

      debug.info(`Files potentially created by pipeline (${newOrModifiedFiles.length}):`);
      newOrModifiedFiles.forEach(file => {
        debug.info(`  - ${file}`);
      });
    } catch (error) {
      debug.error('Error listing files:', error);

      // Try a direct system command as backup
      try {
        debug.warn('Trying alternate listing method...');
        const findResults = execSync(`find ${projectDirPath} -type f | sort`).toString();
        debug.info('Files found with system command:\n' + findResults);
      } catch (findError) {
        debug.error('Error with system find command:', findError);
      }
    }

    // 7. Validate specific expected files for a landing page
    debug.log('\n🔍 Checking for expected files:');
    const expectedFiles = [
      'next.config.js', // may be created as .js or .ts
      'app/page.tsx',
      'components/landing',
    ];

    let allFilesFound = true;
    // Check for existing directory for components/landing (directories are considered found even if empty)
    const landingDirExists = await fs.access(path.join(projectDirPath, 'components/landing')).then(
      () => true,
      () => false
    );

    for (const expectedFile of expectedFiles) {
      // Special case for directories
      if (expectedFile === 'components/landing' && landingDirExists) {
        debug.success(`Found expected directory: ${expectedFile}`);
        continue;
      }

      const found = files.some(file => file.includes(expectedFile));
      if (found) {
        debug.success(`Found expected file/directory: ${expectedFile}`);
      } else {
        debug.error(`Missing expected file/directory: ${expectedFile}`);
        allFilesFound = false;
      }
    }

    // 8. Check for minimum number of new files (beyond scaffolded template)
    const newFilesCount = files.filter(
      file =>
        !file.includes('node_modules') &&
        !file.endsWith('.gitignore') &&
        !file.endsWith('tsconfig.json') &&
        (file.endsWith('.tsx') || file.endsWith('.jsx') || file.endsWith('.js'))
    ).length;

    if (newFilesCount < 3) {
      debug.warn(`Only ${newFilesCount} new files created, expected at least 3`);
      allFilesFound = false;
    } else {
      debug.success(`Generated ${newFilesCount} new files total`);
    }

    // 9. Check for page.tsx content if it exists
    const pagePath = files.find(file => file.endsWith('page.tsx'));
    if (pagePath) {
      try {
        const pageContent = await fs.readFile(path.join(projectDirPath, pagePath), 'utf8');
        debug.log('\n📋 Checking page content:');
        if (pageContent.includes('Slack') || pageContent.includes('messaging')) {
          debug.success('Page content contains relevant keywords from the prompt');
        } else {
          debug.warn('Page content may not be relevant to the prompt');
        }

        // Log the first few lines of the content for verification
        const contentPreview = pageContent.split('\n').slice(0, 10).join('\n');
        debug.info(`Page content preview:\n${contentPreview}\n...`);
      } catch (error) {
        debug.error('Could not read page content:', error);
      }
    } else {
      debug.error('No page.tsx file found to check content');
    }

    if (allFilesFound) {
      debug.success('\nAll expected files were created successfully!');
    } else {
      debug.warn('\nSome expected files were not created');
    }

    debug.log('✅ End-to-end test completed successfully!');
  } catch (error) {
    debug.error('Error during test:', error);
    process.exit(1);
  }
}

// Run the test
main()
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('Test script execution finished.');
    process.exit(1);
  });
