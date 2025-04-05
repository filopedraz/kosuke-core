import Dockerode from 'dockerode';
import { EventEmitter } from 'events';
import { Readable } from 'stream';
import { BaseRunner } from './baseRunner';
import fetch from 'node-fetch';
import { PREVIEW } from '@/lib/constants';

/**
 * DockerPreviewManager
 *
 * This module provides functionality to manage Next.js preview applications
 * in Docker containers. It handles creation, monitoring, and controlling
 * Docker containers for project previews.
 *
 * Key features:
 * - Creates and manages Docker containers for projects
 * - Detects successful compilation status through log monitoring
 * - Monitors container health and responsiveness
 * - Provides cleanup and shutdown capabilities
 * - Implements singleton pattern for global management
 *
 * Events emitted:
 * - 'compilationComplete': When a project's Next.js app has been successfully compiled
 * - 'containerExit': When a container exits
 * - 'error': When a container encounters an error
 */

/**
 * Helper function to get a random port in a range
 */
function getRandomPort(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min) + min);
}

/**
 * Interface for container information
 */
interface ContainerInfo {
  container: Dockerode.Container;
  port: number;
  url: string;
  compilationComplete: boolean;
  logStream?: Readable;
}

/**
 * Docker-based preview runner using Docker containers
 */
export class DockerRunner extends BaseRunner {
  private static instance: DockerRunner;
  private docker: Dockerode;
  private containers: Map<number, ContainerInfo> = new Map();
  private eventEmitter: EventEmitter = new EventEmitter();

  private constructor() {
    super();
    this.docker = new Dockerode();
    console.log('🐳 Docker-based preview runner initialized');
  }

  public static getInstance(): DockerRunner {
    if (!DockerRunner.instance) {
      DockerRunner.instance = new DockerRunner();
    }
    return DockerRunner.instance;
  }

  /**
   * Check if Docker is available on the system
   */
  public async isDockerAvailable(): Promise<boolean> {
    try {
      await this.docker.ping();
      return true;
    } catch (error) {
      console.error('❌ Docker is not available:', error);
      return false;
    }
  }

  /**
   * This method should NOT be called during initialization.
   * It should only be called during server shutdown, similar to stopAll().
   * For normal operation, we want to reuse existing containers, not clean them up.
   */
  public async cleanupOrphanedContainers(): Promise<void> {
    try {
      const containers = await this.docker.listContainers({
        all: true,
        filters: {
          name: [PREVIEW.CONTAINER_NAME_PREFIX],
        },
      });

      console.log(`Found ${containers.length} preview containers to clean up on shutdown`);

      for (const container of containers) {
        try {
          const containerName = container.Names[0].replace('/', '');
          const dockerContainer = this.docker.getContainer(container.Id);

          console.log(`Shutting down container ${containerName} (state: ${container.State})`);

          // Force stop and remove regardless of state
          if (container.State === 'running') {
            try {
              await dockerContainer.stop({ t: 5 }); // 5 second timeout
              console.log(`Stopped container ${containerName}`);
            } catch (stopError) {
              console.log(
                `Note: Could not gracefully stop container ${containerName}, continuing to force removal (error: ${stopError})`
              );
            }
          }

          // Always force remove
          try {
            await dockerContainer.remove({ force: true });
            console.log(`Removed container ${containerName}`);
          } catch (removeError) {
            console.error(`Error removing container ${containerName}:`, removeError);
          }
        } catch (error) {
          console.error(`Error handling container cleanup:`, error);
        }
      }
    } catch (error) {
      console.error('Error cleaning up containers:', error);
    }
  }

  public async startApp(projectId: number): Promise<string> {
    if (this.containers.has(projectId)) {
      // Container already exists for this project in our tracking
      const containerInfo = this.containers.get(projectId)!;
      return containerInfo.url;
    }

    // Generate a unique name for the container
    const containerName = `${PREVIEW.CONTAINER_NAME_PREFIX}${projectId}`;

    try {
      // First, try to directly get the container by name - most reliable way to check existence
      let existingContainer;
      try {
        console.log(`Checking if container with name "${containerName}" already exists`);
        existingContainer = this.docker.getContainer(containerName);
        // If we get here, the container exists - inspect it to get its status
        const containerInfo = await existingContainer.inspect();
        console.log(`[DEBUG] Found existing container "${containerName}", ID: ${containerInfo.Id}`);
        console.log(`[DEBUG] Container state: ${JSON.stringify(containerInfo.State)}`);
        console.log(
          `[DEBUG] Container network settings: ${JSON.stringify(containerInfo.NetworkSettings.Ports)}`
        );

        // Check if the container is running
        if (containerInfo.State.Running) {
          console.log(`Container "${containerName}" is already running, reusing it`);

          // Get port mapping
          const ports = containerInfo.NetworkSettings.Ports;
          const portMapping = ports && ports['3000/tcp'];
          console.log(`[DEBUG] Port mapping for 3000/tcp: ${JSON.stringify(portMapping)}`);

          if (portMapping && portMapping.length > 0 && portMapping[0].HostPort) {
            const hostPort = parseInt(portMapping[0].HostPort);
            const url = `http://localhost:${hostPort}`;
            console.log(`Container is exposing port ${hostPort}, url: ${url}`);

            // Add to our tracking
            const containerTrackingInfo: ContainerInfo = {
              container: existingContainer,
              port: hostPort,
              url,
              compilationComplete: true, // Assume it's ready since it's running
            };

            this.containers.set(projectId, containerTrackingInfo);
            this.urls.set(projectId, url);

            // Setup monitoring
            await this.monitorContainerLogs(projectId, existingContainer);
            this.monitorContainerExit(projectId, existingContainer);

            return url;
          } else {
            console.log(`[DEBUG] Container is running but has no valid port mapping for 3000/tcp`);
          }
        } else {
          console.log(
            `[DEBUG] Container exists but is not running. State: ${containerInfo.State.Status}`
          );
        }

        // If we get here, the container exists but isn't running properly or has no port mapping
        console.log(
          `Container "${containerName}" exists but isn't running properly or has no port mapping, removing it`
        );

        // Make sure it's stopped
        try {
          await existingContainer.stop();
          console.log(`Stopped container "${containerName}"`);
        } catch (error) {
          // Ignore errors when stopping - it might already be stopped
          console.log(
            `Note: Could not stop container "${containerName}" - it may already be stopped. Error: ${error}`
          );
        }

        // Remove the container
        try {
          await existingContainer.remove({ force: true });
          console.log(`Removed container "${containerName}"`);
        } catch (removeError) {
          console.error(
            `[ERROR] Failed to remove container "${containerName}". Error: ${removeError}`
          );
          throw new Error(`Failed to remove existing container "${containerName}": ${removeError}`);
        }
        existingContainer = null;
      } catch (error) {
        if ((error as { statusCode?: number }).statusCode === 404) {
          // Container doesn't exist, which is fine
          console.log(
            `No existing container named "${containerName}" found, will create a new one`
          );
        } else {
          // Some other error occurred - log it but continue
          console.error(`[ERROR] Error checking for existing container "${containerName}":`, error);
          console.error(`[ERROR] Error details: ${JSON.stringify(error)}`);
          throw error; // Re-throw so we don't try to create a new container when there's a problem
        }
        existingContainer = null;
      }

      // Container doesn't exist or was removed, create a new one
      // Select a random port between 3000-4000 for the container
      const hostPort = getRandomPort(3000, 4000);

      console.log(`Starting new container for project ${projectId} on port ${hostPort}`);

      // Define the project path on the host
      const projectPath = `${process.cwd()}/projects/${projectId}`;
      console.log(`Mounting project files from ${projectPath} to /app/project in container`);

      // Set working directory and command for the container
      const workDir = '/app/project';
      const cmd = ['sh', '-c', 'cd /app/project && ls -la && npm run dev -- -H 0.0.0.0'];

      // Create the container
      const container = await this.docker.createContainer({
        Image: PREVIEW.DEFAULT_IMAGE,
        name: containerName,
        Env: [`PROJECT_ID=${projectId}`, 'NODE_ENV=development', 'NEXT_TELEMETRY_DISABLED=1'],
        WorkingDir: workDir,
        Cmd: cmd,
        ExposedPorts: {
          '3000/tcp': {},
        },
        HostConfig: {
          PortBindings: {
            '3000/tcp': [{ HostPort: hostPort.toString(), HostIp: '0.0.0.0' }],
          },
          Binds: [`${projectPath}:/app/project:rw`],
          AutoRemove: false,
          NetworkMode: 'bridge',
        },
      });

      // Start the container
      await container.start();
      console.log(`Successfully started container "${containerName}"`);

      // Define the URL for accessing the preview
      const url = `http://localhost:${hostPort}`;

      // Create container info and add to the map
      const containerInfo: ContainerInfo = {
        container,
        port: hostPort,
        url,
        compilationComplete: false,
      };

      this.containers.set(projectId, containerInfo);
      this.urls.set(projectId, url);

      // Setup log monitoring to detect successful compilation
      await this.monitorContainerLogs(projectId, container);

      // Setup container exit monitoring
      this.monitorContainerExit(projectId, container);

      return url;
    } catch (error) {
      console.error(`Error starting container for project ${projectId}:`, error);
      throw new Error(`Failed to start preview for project ${projectId}: ${error}`);
    }
  }

  private async monitorContainerLogs(
    projectId: number,
    container: Dockerode.Container
  ): Promise<void> {
    const logStream = await container.logs({
      follow: true,
      stdout: true,
      stderr: true,
      tail: 10,
    });

    const containerInfo = this.containers.get(projectId);
    if (containerInfo) {
      containerInfo.logStream = logStream as Readable;
    }

    logStream.on('data', (chunk: Buffer) => {
      const log = chunk.toString('utf8');

      // Check for successful compilation in logs
      if (log.includes('compiled successfully') || log.includes('ready started server')) {
        const containerInfo = this.containers.get(projectId);
        if (containerInfo && !containerInfo.compilationComplete) {
          containerInfo.compilationComplete = true;
          this.eventEmitter.emit('compilationComplete', projectId);
          console.log(`Compilation complete for project ${projectId}`);
        }
      }
    });

    // Create a timeout for compilation
    const timeoutId = setTimeout(() => {
      const containerInfo = this.containers.get(projectId);
      if (containerInfo && !containerInfo.compilationComplete) {
        console.error(`Compilation timeout for project ${projectId}`);
        // Mark as complete anyway to allow the preview to proceed
        // This helps in cases where the "compiled successfully" message might be missed
        containerInfo.compilationComplete = true;
        this.eventEmitter.emit('compilationComplete', projectId);
        // Also emit a warning event, but don't fail the process
        this.eventEmitter.emit(
          'warning',
          projectId,
          new Error('Compilation timeout but proceeding anyway')
        );
      }
    }, PREVIEW.COMPILATION_TIMEOUT);

    // Clear timeout if container exits
    this.eventEmitter.once('containerExit', (pid: number) => {
      if (pid === projectId) {
        clearTimeout(timeoutId);
      }
    });
  }

  private monitorContainerExit(projectId: number, container: Dockerode.Container): void {
    container.wait((err: Error | null) => {
      if (err) {
        console.error(`Container for project ${projectId} encountered an error:`, err);
        this.eventEmitter.emit('error', projectId, err);
      } else {
        console.log(`Container for project ${projectId} exited`);
        this.eventEmitter.emit('containerExit', projectId);
        this.containers.delete(projectId);
        this.urls.delete(projectId);
      }
    });
  }

  public async stopApp(projectId: number): Promise<void> {
    const containerInfo = this.containers.get(projectId);
    if (!containerInfo) {
      console.log(`No container found for project ${projectId}`);
      return;
    }

    try {
      console.log(`Stopping container for project ${projectId}`);

      // Close the log stream if it exists
      if (containerInfo.logStream) {
        containerInfo.logStream.destroy();
      }

      // Stop the container with a short timeout
      try {
        await containerInfo.container.stop({ t: 2 }); // 2 second timeout
        console.log(`Container for project ${projectId} stopped`);
      } catch (stopError) {
        // If stopping fails, log but continue to force removal
        console.log(
          `Could not gracefully stop container for project ${projectId}, will force remove: ${stopError}`
        );
      }

      // Force remove the container
      try {
        await containerInfo.container.remove({ force: true });
        console.log(`Container for project ${projectId} forcefully removed`);
      } catch (removeError) {
        console.error(
          `Error removing container for project ${projectId}, continuing anyway: ${removeError}`
        );
        // Even if removal fails, we'll still clear our local tracking below
      }

      // Remove from maps regardless of whether the Docker operations succeeded
      this.containers.delete(projectId);
      this.urls.delete(projectId);

      console.log(`Container for project ${projectId} tracking cleared`);
    } catch (error) {
      console.error(`Error stopping container for project ${projectId}:`, error);
      // Still clean up our maps to prevent stale entries
      this.containers.delete(projectId);
      this.urls.delete(projectId);
      throw new Error(`Failed to stop preview for project ${projectId}: ${error}`);
    }
  }

  public async isReadyForPreview(projectId: number): Promise<boolean> {
    const containerInfo = this.containers.get(projectId);
    if (!containerInfo) {
      return false;
    }

    // Check if the container is running and compilation is complete
    if (!containerInfo.compilationComplete) {
      return false;
    }

    // Try to ping the service to see if it's responding
    try {
      const response = await fetch(containerInfo.url, {
        timeout: PREVIEW.SERVER_RESPONSE_TIMEOUT,
      });
      return response.ok;
    } catch (error) {
      console.log(`Server not responding for project ${projectId}: ${error}`);
      return false;
    }
  }

  public async getProjectStatus(projectId: number): Promise<{
    running: boolean;
    url: string | null;
    compilationComplete: boolean;
    isResponding: boolean;
  }> {
    const containerInfo = this.containers.get(projectId);
    if (!containerInfo) {
      return {
        running: false,
        url: null,
        compilationComplete: false,
        isResponding: false,
      };
    }

    let isResponding = false;
    try {
      // Check if the server is responding
      const response = await fetch(containerInfo.url, {
        timeout: PREVIEW.SERVER_RESPONSE_TIMEOUT,
      });
      isResponding = response.ok;
    } catch (error) {
      console.log(`Server not responding for project ${projectId}: ${error}`);
    }

    return {
      running: true,
      url: containerInfo.url,
      compilationComplete: containerInfo.compilationComplete,
      isResponding,
    };
  }

  public isCompilationComplete(projectId: number): boolean {
    const containerInfo = this.containers.get(projectId);
    return containerInfo ? containerInfo.compilationComplete : false;
  }

  /**
   * Update tracking for an existing container discovered outside this class
   * @param projectId The project ID to update tracking for
   * @param containerName The name of the container
   * @param hostPort The host port that the container is mapped to
   */
  public async updateTrackingForExistingContainer(
    projectId: number,
    containerName: string,
    hostPort: number
  ): Promise<void> {
    console.log(
      `[DockerRunner] Updating tracking for existing container ${containerName} with port ${hostPort}`
    );

    try {
      // Get the container object by name
      const container = this.docker.getContainer(containerName);

      // Create the URL
      const url = `http://localhost:${hostPort}`;

      // Create container info and add to the map
      const containerInfo: ContainerInfo = {
        container,
        port: hostPort,
        url,
        compilationComplete: true, // Assume it's complete since it's already running
      };

      // Update our tracking
      this.containers.set(projectId, containerInfo);
      this.urls.set(projectId, url);

      // Setup monitoring
      this.monitorContainerExit(projectId, container);

      console.log(`[DockerRunner] Successfully updated tracking for ${containerName}`);
    } catch (error) {
      console.error(`[DockerRunner] Error updating tracking for ${containerName}:`, error);
      throw new Error(`Failed to update tracking for container ${containerName}: ${error}`);
    }
  }

  public async stopAll(): Promise<void> {
    console.log('Stopping all preview containers');

    const projectIds = Array.from(this.containers.keys());

    for (const projectId of projectIds) {
      try {
        console.log(`Stopping container for project ${projectId}`);
        await this.stopApp(projectId);
      } catch (error) {
        console.error(`Error stopping container for project ${projectId}:`, error);
      }
    }

    console.log('All tracked containers stopped');

    // Clear the tracking maps
    this.containers.clear();
    this.urls.clear();
  }
}
