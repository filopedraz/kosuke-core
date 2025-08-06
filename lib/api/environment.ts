import { db } from '@/lib/db/drizzle';
import { projectEnvironmentVariables } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Fetch environment variables for a project to use in preview containers
 * Returns a key-value object suitable for Docker container environment
 */
export async function getProjectEnvironmentVariables(projectId: number): Promise<Record<string, string>> {
  try {
    const variables = await db
      .select({
        key: projectEnvironmentVariables.key,
        value: projectEnvironmentVariables.value,
      })
      .from(projectEnvironmentVariables)
      .where(eq(projectEnvironmentVariables.projectId, projectId));

    // Convert to key-value object
    const envVars: Record<string, string> = {};
    for (const variable of variables) {
      envVars[variable.key] = variable.value;
    }

    return envVars;
  } catch (error) {
    console.error(`Failed to fetch environment variables for project ${projectId}:`, error);
    // Return empty object if fetch fails - don't block preview creation
    return {};
  }
}