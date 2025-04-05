import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

// Import project components
import { db } from '../lib/db/drizzle';
import { users } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import { createProject as dbCreateProject } from '../lib/db/projects';
import { Agent } from '../lib/llm/core/agent';
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
 * 4. Directly validating the app/page.tsx contains "Hello World"
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
    const projectDirPath = getProjectPath(project.id);
    try {
      debug.info('Verifying initial scaffolded files...');
      const initialFiles = await listFilesRecursively(projectDirPath);
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

    // 4. Trigger the naive pipeline directly without saving messages to the database
    debug.pipeline('Initializing naive pipeline agent...');
    const agent = new Agent(project.id);

    debug.pipeline('Running agent with prompt...');

    // Start pipeline execution with timeout monitoring
    const startTime = Date.now();
    const result = await agent.run(testPrompt);
    const endTime = Date.now();
    debug.success(
      `Agent run completed in ${(endTime - startTime) / 1000}s with result: ${JSON.stringify(result)}`
    );

    // 5. Directly check the file system to validate file creation
    debug.log('\n📁 Checking files created in the project directory...');

    // List directories first to understand structure
    debug.info('Project directory structure:');
    try {
      const dirContents = execSync(`find ${projectDirPath} -type d | sort`).toString();
      debug.info('Directories:\n' + dirContents);
    } catch (execError) {
      debug.error('Error listing directories:', execError);
    }

    // Get recursive list of files
    let files: string[] = [];
    try {
      files = await listFilesRecursively(projectDirPath);
      debug.info(`Found ${files.length} total files in project directory`);
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

    // 6. Check if app/page.tsx contains 'Hello World'
    debug.log('\n🔎 Checking if app/page.tsx contains "Hello World"...');

    const pagePath = files.find(
      file => file.endsWith('app/page.tsx') || file.endsWith('app\\page.tsx')
    );

    if (!pagePath) {
      debug.error('❌ app/page.tsx file not found!');
      process.exit(1);
    }

    debug.success(`Found app/page.tsx at: ${pagePath}`);

    try {
      const fullPagePath = path.join(projectDirPath, pagePath);
      debug.info(`Reading file content from: ${fullPagePath}`);

      const pageContent = await fs.readFile(fullPagePath, 'utf8');
      debug.info(`File content length: ${pageContent.length} characters`);

      // Log the first 20 lines of the content for verification
      const contentPreview = pageContent.split('\n').slice(0, 20).join('\n');
      debug.info(`Page content preview:\n${contentPreview}\n...`);

      if (pageContent.toLowerCase().includes('Hello World')) {
        debug.success('✅ SUCCESS: app/page.tsx contains "Hello World"');
      } else {
        debug.error('❌ FAILED: app/page.tsx does not contain "Hello World"');
        debug.info('Full page content:');
        debug.info(pageContent);
        process.exit(1);
      }
    } catch (error) {
      debug.error('Error reading app/page.tsx:', error);
      process.exit(1);
    }

    debug.log('✅ Naive pipeline test completed successfully!');
    process.exit(0);
  } catch (error) {
    debug.error('Error during test:', error);
    process.exit(1);
  }
}

// Run the test
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
