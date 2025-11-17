/**
 * Docker Service
 * Manages Docker containers for preview environments
 */

import { sessionManager } from '@/lib/sessions';
import type { DockerContainerStatus, RouteInfo } from '@/lib/types/docker';
import type { PreviewUrl, PreviewUrlsResponse } from '@/lib/types/preview-urls';
import { DockerClient, type ContainerCreateRequest } from '@docker/node-sdk';
import { join } from 'path';
import { getDockerConfig, validateDockerConfig } from './config';
import { PortRouterAdapter, TraefikRouterAdapter, type RouterAdapter } from './router-adapters';

class DockerService {
  private client: DockerClient | null = null;
  private config;
  private adapter: RouterAdapter;
  private hostProjectsDir: string;

  constructor() {
    this.config = getDockerConfig();
    validateDockerConfig(this.config);

    this.hostProjectsDir = join(this.config.hostWorkspaceDir, 'projects');

    // Select router adapter based on configuration
    if (this.config.routerMode === 'traefik') {
      this.adapter = new TraefikRouterAdapter();
    } else {
      this.adapter = new PortRouterAdapter(
        this.config.previewPortRangeStart,
        this.config.previewPortRangeEnd
      );
    }

    console.log(`DockerService initialized with host projects directory: ${this.hostProjectsDir}`);
    console.log(`Router mode: ${this.config.routerMode}`);
  }

  /**
   * Initialize Docker client
   */
  private async ensureClient(): Promise<DockerClient> {
    if (!this.client) {
      try {
        this.client = await DockerClient.fromDockerConfig();
        console.log('Docker client initialized successfully');
      } catch (error) {
        console.error('Docker client initialization failed:', error);
        throw new Error(
          `Failed to initialize Docker client: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
    return this.client;
  }

  /**
   * Get container name for a project session
   */
  private getContainerName(projectId: string, sessionId: string): string {
    return `${this.config.previewContainerNamePrefix}${projectId}-${sessionId}`;
  }

  /**
   * Get host session path (absolute path on host machine for Docker-in-Docker)
   */
  private getHostSessionPath(projectId: string, sessionId: string): string {
    return join(this.hostProjectsDir, projectId, 'sessions', sessionId);
  }

  /**
   * Prepare container environment variables
   */
  private prepareContainerEnvironment(
    projectId: string,
    sessionId: string,
    envVars: Record<string, string> = {}
  ): string[] {
    const postgresUrl =
      `postgres://${this.config.postgresUser}:${this.config.postgresPassword}` +
      `@${this.config.postgresHost}:${this.config.postgresPort}` +
      `/kosuke_project_${projectId}_session_${sessionId}`;

    const environment = {
      NODE_ENV: 'development',
      PORT: '3000',
      POSTGRES_URL: postgresUrl,
      ...envVars,
    };

    // Convert to Docker format: ["KEY=value", ...]
    return Object.entries(environment).map(([key, value]) => `${key}=${value}`);
  }

  /**
   * Ensure preview image is available (pull if needed)
   */
  private async ensurePreviewImage(): Promise<void> {
    const client = await this.ensureClient();
    const imageName = this.config.previewDefaultImage;

    try {
      console.log(`Checking preview image ${imageName}`);
      await client.imageInspect(imageName);
      console.log(`Preview image ${imageName} is available locally`);
    } catch {
      // Image not found, need to pull
      console.log(`Pulling preview image ${imageName}...`);
      try {
        // imageCreate takes a callback as first parameter and options as second
        await client.imageCreate({ fromImage: imageName });
        console.log(`Successfully pulled preview image ${imageName}`);
      } catch (pullError) {
        throw new Error(
          `Failed to pull preview image ${imageName}: ${pullError instanceof Error ? pullError.message : 'Unknown error'}`
        );
      }
    }
  }

  /**
   * Get existing container by name
   */
  private async getContainerByName(containerName: string) {
    try {
      const client = await this.ensureClient();
      const container = await client.containerInspect(containerName);
      return container;
    } catch {
      // Container not found
      return null;
    }
  }

  /**
   * Check if container is running and healthy
   */
  private async getExistingContainerUrlOrRemove(containerName: string): Promise<string | null> {
    const container = await this.getContainerByName(containerName);
    if (!container) {
      return null;
    }

    // If running, try to get URL
    if (container.State?.Running) {
      const url = this.adapter.getContainerUrl(container);
      if (url) {
        console.log(`Reusing existing container ${containerName} with URL ${url}`);
        return url;
      }
    }

    // Try to restart once
    try {
      const client = await this.ensureClient();
      console.log(`Attempting to restart container ${containerName}`);
      await client.containerRestart(containerName);

      // Wait a bit for restart
      await new Promise(resolve => setTimeout(resolve, 2000));

      const reloadedContainer = await this.getContainerByName(containerName);
      if (reloadedContainer?.State?.Running) {
        const url = this.adapter.getContainerUrl(reloadedContainer);
        if (url) {
          console.log(`Successfully restarted container ${containerName}`);
          return url;
        }
      }
    } catch (error) {
      console.log(`Failed to restart container ${containerName}:`, error);
    }

    // Force remove to allow clean recreate
    try {
      const client = await this.ensureClient();
      console.log(`Removing stale container ${containerName}`);
      await client.containerDelete(containerName, { force: true });
    } catch (error) {
      console.log(`Failed to remove container ${containerName}:`, error);
    }

    return null;
  }

  /**
   * Create container configuration based on router adapter
   */
  private createContainerConfig(
    environment: string[],
    hostSessionPath: string,
    routeInfo: RouteInfo
  ): ContainerCreateRequest {
    const baseHostConfig = {
      Binds: [`${hostSessionPath}:/app:rw`],
      NetworkMode: this.config.previewNetwork,
      AutoRemove: false,
    };

    const config: ContainerCreateRequest = {
      Image: this.config.previewDefaultImage,
      Env: environment,
      Labels: routeInfo.labels,
      WorkingDir: '/app',
      HostConfig: baseHostConfig,
    };

    // Add port bindings for port mode
    if (this.config.routerMode === 'port' && routeInfo.port) {
      config.HostConfig = {
        ...baseHostConfig,
        PortBindings: {
          '3000/tcp': [{ HostPort: String(routeInfo.port) }],
        },
      };
    }

    return config;
  }

  /**
   * Run container with retries (handles port conflicts)
   */
  private async runContainerWithRetries(
    projectId: string,
    sessionId: string,
    environment: string[],
    hostSessionPath: string,
    containerName: string
  ): Promise<string> {
    await this.ensurePreviewImage();

    const client = await this.ensureClient();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      const routeInfo = this.adapter.prepareRun(projectId, sessionId, containerName);
      console.log(
        `Attempt ${attempt}/3 to start preview container ${containerName} ` +
          `${routeInfo.port ? `on port ${routeInfo.port}` : 'with Traefik'}`
      );

      try {
        const config = this.createContainerConfig(environment, hostSessionPath, routeInfo);

        // Create and start container - pass name as option, not in body
        const createResponse = await client.containerCreate(config, { name: containerName });
        await client.containerStart(createResponse.Id);

        console.log(`Successfully started container ${containerName}`);
        return routeInfo.url;
      } catch (error: unknown) {
        lastError = error as Error;
        const message = error instanceof Error ? error.message : String(error);

        const isPortConflict =
          message.includes('port is already allocated') ||
          message.includes('address already in use') ||
          message.includes('Bind for 0.0.0.0');

        // Clean up any partially created container
        try {
          await client.containerDelete(containerName, { force: true });
        } catch {
          // Ignore cleanup errors
        }

        if (isPortConflict && attempt < 3 && this.config.routerMode === 'port') {
          console.warn(`Port conflict for ${containerName}. Retrying with a new port...`);
          await new Promise(resolve => setTimeout(resolve, 200));
          continue;
        }

        console.error(
          `Failed to start preview container ${containerName} on attempt ${attempt}:`,
          message
        );
        break;
      }
    }

    if (lastError) {
      throw lastError;
    }
    throw new Error('Failed to start preview container due to unknown error');
  }

  /**
   * Check container health via HTTP
   */
  private async checkContainerHealth(url: string, timeout = 2000): Promise<boolean> {
    // Adjust for Docker-in-Docker - replace localhost with host.docker.internal
    const baseUrl = url.replace('localhost', 'host.docker.internal');
    const healthUrl = baseUrl.endsWith('/')
      ? `${baseUrl}${this.config.previewHealthPath.replace(/^\//, '')}`
      : `${baseUrl}${this.config.previewHealthPath}`;

    console.log(`Checking health of ${healthUrl}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(healthUrl, {
        signal: controller.signal,
        method: 'GET',
      });

      console.log(`Health check response: ${response.ok}`);

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.log(`Health check failed for ${healthUrl}:`, error);
      return false;
    }
  }

  /**
   * Start preview container for a project session
   */
  async startPreview(
    projectId: string,
    sessionId: string,
    envVars: Record<string, string> = {},
    userId: string
  ): Promise<string> {
    const containerName = this.getContainerName(projectId, sessionId);
    console.log(
      `Starting preview for project ${projectId} session ${sessionId} as ${containerName}`
    );

    // Check Docker availability
    try {
      const client = await this.ensureClient();
      await client.systemPing();
    } catch (error) {
      console.error('Docker is not available:', error);
      throw new Error('Docker is not available');
    }

    // Ensure session directory exists (create if needed)
    await sessionManager.ensureSessionEnvironment(projectId, sessionId, userId);

    // Reuse existing running container if possible
    const existingUrl = await this.getExistingContainerUrlOrRemove(containerName);
    if (existingUrl) {
      return existingUrl;
    }

    // Create new container
    const hostSessionPath = this.getHostSessionPath(projectId, sessionId);
    const environment = this.prepareContainerEnvironment(projectId, sessionId, envVars);

    const url = await this.runContainerWithRetries(
      projectId,
      sessionId,
      environment,
      hostSessionPath,
      containerName
    );

    console.log(`Preview started successfully at ${url}`);
    return url;
  }

  /**
   * Get preview status for a session
   */
  async getPreviewStatus(projectId: string, sessionId: string): Promise<DockerContainerStatus> {
    const containerName = this.getContainerName(projectId, sessionId);
    const container = await this.getContainerByName(containerName);

    if (!container || !container.State?.Running) {
      return {
        running: false,
        url: null,
        is_responding: false,
      };
    }

    const url = this.adapter.getContainerUrl(container);
    if (!url) {
      return {
        running: true,
        url: null,
        is_responding: false,
      };
    }

    const isResponding = await this.checkContainerHealth(url);

    return {
      running: true,
      url,
      is_responding: isResponding,
    };
  }

  /**
   * Stop and remove preview container for a session
   */
  async stopPreview(projectId: string, sessionId: string): Promise<void> {
    const containerName = this.getContainerName(projectId, sessionId);
    console.log(`Stopping preview container ${containerName}`);

    const container = await this.getContainerByName(containerName);
    if (!container) {
      console.log(`Container ${containerName} not found, nothing to stop`);
      return;
    }

    const client = await this.ensureClient();

    // Stop container with timeout (suppress errors)
    try {
      console.log(`Stopping container ${containerName}...`);
      await client.containerStop(containerName, { timeout: 5 });
      console.log(`Container ${containerName} stopped successfully`);
    } catch (error) {
      console.log(`Failed to stop container ${containerName}:`, error);
      // Continue to removal even if stop fails
    }

    // Remove container forcefully (suppress errors)
    try {
      console.log(`Removing container ${containerName}...`);
      await client.containerDelete(containerName, { force: true });
      console.log(`Container ${containerName} removed successfully`);
    } catch (error) {
      console.log(`Failed to remove container ${containerName}:`, error);
      // Ignore removal errors
    }
  }

  /**
   * Check if a container is running for a session
   */
  async isContainerRunning(projectId: string, sessionId: string): Promise<boolean> {
    const containerName = this.getContainerName(projectId, sessionId);
    const container = await this.getContainerByName(containerName);
    return Boolean(container && container.State?.Running);
  }

  /**
   * Restart a preview container for a session
   */
  async restartPreviewContainer(projectId: string, sessionId: string): Promise<void> {
    const containerName = this.getContainerName(projectId, sessionId);
    console.log(`Restarting preview container ${containerName}`);

    const container = await this.getContainerByName(containerName);
    if (!container) {
      console.warn(`Container ${containerName} not found, cannot restart`);
      throw new Error(`Container not found: ${containerName}`);
    }

    const client = await this.ensureClient();

    try {
      await client.containerRestart(containerName);
      console.log(`✅ Container ${containerName} restarted successfully`);
    } catch (error) {
      console.error(`❌ Failed to restart container ${containerName}:`, error);
      throw new Error(
        `Failed to restart container: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get all preview URLs for a project
   * Lists all containers for a project and extracts their preview URLs
   */
  async getProjectPreviewUrls(projectId: string): Promise<PreviewUrlsResponse> {
    console.log(`📋 Getting preview URLs for project ${projectId}`);

    try {
      const client = await this.ensureClient();
      const namePrefix = `${this.config.previewContainerNamePrefix}${projectId}-`;

      // List all containers (running and stopped)
      const allContainers = await client.containerList({ all: true });

      // Filter containers by name prefix
      const projectContainers = allContainers.filter(container => {
        const name = container.Names?.[0]?.replace(/^\//, '') || '';
        return name.startsWith(namePrefix);
      });

      console.log(`Found ${projectContainers.length} container(s) for project ${projectId}`);

      const previewUrls: PreviewUrl[] = [];

      for (const container of projectContainers) {
        try {
          const containerName = container.Names?.[0]?.replace(/^\//, '') || '';

          // Get full container details for URL resolution
          const containerDetails = await client.containerInspect(containerName);

          // Resolve URL using router adapter
          const fullUrl = this.adapter.getContainerUrl(containerDetails);

          if (!fullUrl) {
            console.warn(`Could not resolve URL for container: ${containerName}`);
            continue;
          }

          // Extract labels
          const labels = containerDetails.Config?.Labels || {};

          // Get branch name from labels, or parse from container name
          let branchName = labels['kosuke.branch'] || labels['kosuke.session_id'];
          if (!branchName) {
            // Fallback: parse from container name (format: prefix-projectId-sessionId)
            const nameParts = containerName
              .replace(this.config.previewContainerNamePrefix, '')
              .split('-');
            if (nameParts.length >= 2) {
              branchName = nameParts.slice(1).join('-'); // Everything after projectId
            } else {
              branchName = containerName;
            }
          }

          // Extract subdomain from URL
          let subdomain: string | null = null;
          if (fullUrl.startsWith('https://')) {
            const domain = fullUrl.replace('https://', '').split('/')[0];
            subdomain = domain.split('.')[0]; // First part of domain
          }

          // Map Docker status to TypeScript status type
          const rawStatus = container.State || 'unknown';
          let containerStatus: 'running' | 'stopped' | 'error';
          if (rawStatus === 'running') {
            containerStatus = 'running';
          } else if (rawStatus === 'exited' || rawStatus === 'created' || rawStatus === 'paused') {
            containerStatus = 'stopped';
          } else {
            containerStatus = 'error';
          }

          // Get created timestamp
          const createdAt = containerDetails.Created || new Date().toISOString();

          // Build preview URL object
          const previewUrl: PreviewUrl = {
            id: containerName, // Use container name as unique ID
            project_id: projectId,
            branch_name: branchName,
            subdomain: subdomain || '',
            full_url: fullUrl,
            container_status: containerStatus,
            ssl_enabled: fullUrl.startsWith('https://'),
            created_at: createdAt,
            last_accessed: null, // Not tracked yet
          };

          previewUrls.push(previewUrl);
        } catch (error) {
          console.warn(`Failed to process container:`, error);
          // Continue with other containers
        }
      }

      console.log(`✅ Found ${previewUrls.length} preview URL(s) for project ${projectId}`);

      return {
        preview_urls: previewUrls,
        total_count: previewUrls.length,
      };
    } catch (error) {
      console.error(`❌ Error getting preview URLs for project ${projectId}:`, error);
      // Return empty response on error to maintain interface compatibility
      return {
        preview_urls: [],
        total_count: 0,
      };
    }
  }

  /**
   * Generate a consistent numeric hash from a string
   * Used to create stable IDs for preview URLs
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Stop and remove all preview containers for a project
   * Used when archiving/deleting a project to clean up all associated containers
   */
  async stopAllProjectPreviews(projectId: string): Promise<{ stopped: number; failed: number }> {
    console.log(`Stopping all preview containers for project ${projectId}`);

    try {
      const client = await this.ensureClient();
      const namePrefix = `${this.config.previewContainerNamePrefix}${projectId}-`;

      // List all containers (running and stopped)
      const allContainers = await client.containerList({ all: true });

      // Filter containers by name prefix
      const projectContainers = allContainers.filter(container => {
        const name = container.Names?.[0]?.replace(/^\//, '') || '';
        return name.startsWith(namePrefix);
      });

      if (projectContainers.length === 0) {
        console.log(`No preview containers found for project ${projectId}`);
        return { stopped: 0, failed: 0 };
      }

      console.log(`Found ${projectContainers.length} container(s) for project ${projectId}`);

      let stopped = 0;
      let failed = 0;

      // Stop and remove each container
      for (const container of projectContainers) {
        const containerName =
          container.Names?.[0]?.replace(/^\//, '') || container.Id?.substring(0, 12) || 'unknown';

        try {
          // Stop container if running
          if (container.State === 'running') {
            try {
              await client.containerStop(containerName, { timeout: 5 });
              console.log(`Stopped container ${containerName}`);
            } catch (stopError) {
              console.log(`Failed to stop container ${containerName}:`, stopError);
              // Continue to removal
            }
          }

          // Remove container
          await client.containerDelete(containerName, { force: true });
          console.log(`Removed container ${containerName}`);
          stopped++;
        } catch (error) {
          console.error(`Failed to stop/remove container ${containerName}:`, error);
          failed++;
        }
      }

      console.log(`Project ${projectId} cleanup: ${stopped} stopped, ${failed} failed`);
      return { stopped, failed };
    } catch (error) {
      console.error(`Error stopping project previews for project ${projectId}:`, error);
      throw error;
    }
  }
}

/**
 * Singleton instance of DockerService
 * Initialized once and reused across all requests
 */
let dockerServiceInstance: DockerService | null = null;

/**
 * Get the singleton DockerService instance
 * Creates the instance on first call and reuses it for subsequent calls
 */
export function getDockerService(): DockerService {
  if (!dockerServiceInstance) {
    console.log('🐳 Initializing Docker service singleton...');
    dockerServiceInstance = new DockerService();
  }
  return dockerServiceInstance;
}
