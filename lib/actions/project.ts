'use server';

import { SortOption } from '@/app/(logged-in)/projects/components/project-filters';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { createProject as dbCreateProject, getProjectsByUserId } from '@/lib/db/projects';
import { chatMessages, Project } from '@/lib/db/schema';
import { revalidatePath } from 'next/cache';

/**
 * Create a new project
 * @param prompt The user's prompt for the project
 * @param name Optional custom name for the project
 * @returns The created project
 */
export async function createProject(prompt: string, name?: string) {
  try {
    console.log('🚀 Starting project creation process at', new Date().toISOString());

    // Get the session
    const session = await getSession();
    if (!session) {
      throw new Error('Unauthorized');
    }

    // Create the project in the database
    console.log(
      '📝 Creating project in database with prompt:',
      prompt.substring(0, 50) + (prompt.length > 50 ? '...' : '')
    );
    const project = await dbCreateProject({
      name: name || generateProjectName(prompt),
      description: prompt,
      userId: session.user.id,
      createdBy: session.user.id,
    });
    console.log(`✅ Project created with ID: ${project.id}, name: ${project.name}`);

    // Create initial placeholder message in chat to indicate analysis will happen later
    console.log(`💬 Creating initial placeholder message in chat`);
    await db.insert(chatMessages).values({
      projectId: project.id,
      role: 'system',
      content:
        'Project created successfully. Start sending messages in order to update the project.',
    });

    console.log(`✅ Placeholder message created`);

    // Start the preview app asynchronously by calling the Python agent
    // The Docker container will automatically initialize template files when empty
    console.log(`🚀 Starting preview for project ID: ${project.id}`);

    try {
      // Proxy start request to Python agent
      const agentUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';

      // Start the preview asynchronously - don't await to avoid blocking project creation
      fetch(`${agentUrl}/api/preview/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: project.id,
          env_vars: {}, // TODO: Add environment variables from database
        }),
      })
        .then(async response => {
          if (response.ok) {
            const result = await response.json();
            console.log(`✅ Preview started for project ID: ${project.id}`, result);
          } else {
            const error = await response.text();
            console.error(`❌ Error starting preview for project ID: ${project.id}:`, error);
          }
        })
        .catch(err => {
          console.error(`❌ Error in preview startup process for project ID: ${project.id}:`, err);
        });
    } catch (err: unknown) {
      console.error(`❌ Error setting up preview startup for project ID: ${project.id}:`, err);
      // Don't fail the project creation if preview fails to start
    }

    // Revalidate the dashboard path
    revalidatePath('/dashboard');

    return project;
  } catch (error) {
    console.error('❌ Error creating project:', error);
    throw error;
  }
}

/**
 * Generate a project name from a prompt
 * @param prompt The user's prompt
 * @returns A generated project name
 */
function generateProjectName(prompt: string): string {
  // Extract the first few words and convert to kebab-case
  const words = prompt.split(' ').slice(0, 4);
  const name = words
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // Add a timestamp to ensure uniqueness
  const timestamp = Date.now().toString().slice(-6);
  return `${name}-${timestamp}`;
}

/**
 * Get filtered projects for a user
 * @param userId The user ID
 * @param search Optional search term
 * @param sort Sort option
 * @returns Filtered projects
 */
export async function getFilteredProjects(
  userId: number,
  search: string,
  sort: SortOption
): Promise<Project[]> {
  let projects = await getProjectsByUserId(userId);

  // Apply search filter
  if (search) {
    projects = projects.filter(project =>
      project.name.toLowerCase().includes(search.toLowerCase())
    );
  }

  // Apply sorting
  switch (sort) {
    case 'name-asc':
      projects.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'name-desc':
      projects.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case 'newest':
      projects.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      break;
    case 'oldest':
      projects.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      break;
    case 'updated':
      projects.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      break;
    default:
      break;
  }

  return projects;
}
