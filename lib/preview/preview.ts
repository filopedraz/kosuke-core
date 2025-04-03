import { DockerRunner } from './dockerRunner';
import { BaseRunner } from './baseRunner';

/**
 * Get the appropriate runner based on environment
 * - In browser: Returns null (client code should make API calls directly)
 * - On server: Returns DockerRunner by default
 */
export async function getRunner(): Promise<BaseRunner | null> {
  // For browser - return null since client code should make API calls directly
  if (typeof window !== 'undefined') {
    console.log('🖥️ Running in browser, no runner needed');
    return null;
  }

  // For server, use Docker runner by default
  try {
    const dockerRunner = DockerRunner.getInstance();

    // Check if Docker is available
    if (await dockerRunner.isDockerAvailable()) {
      console.log('🐳 Using Docker-based preview runner');
      return dockerRunner;
    } else {
      console.warn('⚠️ Docker is not available, but DockerRunner is required');
      console.warn('⚠️ Ensure Docker is installed and running');
      // Still return DockerRunner - it will handle errors appropriately when methods are called
      return dockerRunner;
    }
  } catch (error) {
    console.error(
      '❌ Error initializing Docker-based preview runner:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    // Return DockerRunner anyway - it will handle errors appropriately
    return DockerRunner.getInstance();
  }
}

// Log that Docker cleanup is now handled by the custom server script
console.log('🔄 Docker container cleanup is managed by the custom server script');
