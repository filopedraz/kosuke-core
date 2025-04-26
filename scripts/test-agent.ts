import { db } from '../lib/db/drizzle';
import { users } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import { createProject as dbCreateProject, getProjectById } from '../lib/db/projects';
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
 * 1. Either using an existing project ID or creating a new test project
 * 2. Triggering the naive pipeline with a test prompt
 * 3. Directly validating the app/page.tsx contains the expected text
 */
async function main() {
  try {
    debug.log('🚀 Starting end-to-end test of naive pipeline...');

    // Parse command line arguments
    const args = process.argv.slice(2);
    let projectId: string | undefined;
    let testPrompt =
      "Change the home page to display a big 'Hello World' in the middle of the page.";

    // Check if arguments were provided
    if (args.length > 0) {
      // First argument could be a project ID
      if (/^\d+$/.test(args[0])) {
        projectId = args[0];
        debug.info(`Using existing project with ID: ${projectId}`);

        // If there's a second argument, it's the test prompt
        if (args.length > 1) {
          testPrompt = args[1];
        }
      } else {
        // If first argument is not a number, treat it as the prompt
        testPrompt = args[0];
      }
    }

    debug.log(`💬 Using test prompt: "${testPrompt}"`);

    let project;
    let projectDirPath;

    // Either use existing project or create a new test project
    if (projectId) {
      // Use existing project
      project = await getProjectById(Number(projectId));

      if (!project) {
        debug.error(`Project with ID ${projectId} not found.`);
        process.exit(1);
      }

      debug.success(`Using existing project: ${project.name} (ID: ${project.id})`);
      projectDirPath = getProjectPath(project.id);
    } else {
      // Create a new test project
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
      project = await dbCreateProject({
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

      projectDirPath = getProjectPath(project.id);

      // List files in the project directory to verify scaffolding
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
    }

    // 3. Trigger the naive pipeline directly without saving messages to the database
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
