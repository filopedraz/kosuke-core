/**
 * Storage Management for Preview Environments
 * Handles creation and cleanup of Postgres databases and Redis containers
 */

import type { KosukeConfig, StorageType } from '@/lib/types/kosuke-config';
import { ContainerCreateRequest, DockerClient } from '@docker/node-sdk';
import { Client } from 'pg';
import { generatePreviewResourceName } from './naming';

export interface StorageConnectionInfo {
  type: StorageType;
  url: string;
}

/**
 * Get database connection info from environment
 */
function getPostgresConfig() {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    throw new Error('POSTGRES_URL environment variable is not set');
  }

  // Parse connection URL
  const pgUrl = new URL(url);
  return {
    host: pgUrl.hostname,
    port: parseInt(pgUrl.port || '5432'),
    user: pgUrl.username,
    password: pgUrl.password,
    database: pgUrl.pathname.slice(1), // Remove leading slash
  };
}

/**
 * Create Postgres database for preview environment
 */
async function createPostgresDatabase(projectId: string, sessionId: string): Promise<string> {
  const config = getPostgresConfig();
  const dbName = generatePreviewResourceName(projectId, sessionId);

  const client = new Client({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: 'postgres',
  });

  try {
    await client.connect();

    // Check if database already exists
    const checkResult = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      dbName,
    ]);

    if (checkResult.rows.length === 0) {
      // Create database
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Created Postgres database: ${dbName}`);
    } else {
      console.log(`Database ${dbName} already exists, reusing`);
    }

    // Build connection URL
    const connectionUrl = `postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${dbName}`;
    return connectionUrl;
  } finally {
    await client.end();
  }
}

/**
 * Drop Postgres database for preview environment
 */
async function dropPostgresDatabase(projectId: string, sessionId: string): Promise<void> {
  const config = getPostgresConfig();
  const dbName = generatePreviewResourceName(projectId, sessionId);

  const client = new Client({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: 'postgres',
  });

  try {
    await client.connect();

    // Terminate all connections to the database
    await client.query(
      `
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = $1 AND pid <> pg_backend_pid()
    `,
      [dbName]
    );

    // Drop database
    await client.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    console.log(`✅ Dropped Postgres database: ${dbName}`);
  } catch (error) {
    console.error(`Failed to drop Postgres database ${dbName}:`, error);
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * Create Redis container for preview environment
 */
async function createRedisContainer(
  projectId: string,
  sessionId: string,
  dockerClient: DockerClient,
  network: string
): Promise<string> {
  const containerName = generatePreviewResourceName(projectId, sessionId, 'redis');
  const imageName = 'redis:alpine';

  try {
    // Check if container already exists
    try {
      const existing = await dockerClient.containerInspect(containerName);
      if (existing.State?.Running) {
        console.log(`Redis container ${containerName} already running`);
        return containerName;
      }
    } catch {
      // Container doesn't exist, will create
      console.log(`Redis container ${containerName} does not exist, will create`);
    }

    // Ensure Redis image is available
    try {
      await dockerClient.imageInspect(imageName);
      console.log(`Redis image ${imageName} is available locally`);
    } catch {
      console.log(`Pulling Redis image ${imageName}...`);
      try {
        await dockerClient.imageCreate({ fromImage: imageName }).wait();
        console.log(`Successfully pulled Redis image ${imageName}`);
      } catch (pullError) {
        throw new Error(
          `Failed to pull Redis image ${imageName}: ${pullError instanceof Error ? pullError.message : 'Unknown error'}`
        );
      }
    }

    // Create Redis container
    const config: ContainerCreateRequest = {
      Image: imageName,
      HostConfig: {
        NetworkMode: network,
        AutoRemove: false,
      },
      Labels: {
        'kosuke.type': 'preview-redis',
        'kosuke.project_id': projectId,
        'kosuke.session_id': sessionId,
      },
    };

    console.log(`Creating Redis container ${containerName}...`);
    const createResponse = await dockerClient.containerCreate(config, { name: containerName });
    console.log('Create response:', JSON.stringify(createResponse, null, 2));

    console.log(`Starting Redis container ${createResponse.Id}...`);
    await dockerClient.containerStart(createResponse.Id);
    console.log(`✅ Created and started Redis container ${containerName}`);

    return containerName;
  } catch (error) {
    console.error(`Failed to create Redis container ${containerName}:`, error);
    throw new Error(
      `Failed to create Redis container: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Stop and remove Redis container for preview environment
 */
async function removeRedisContainer(
  projectId: string,
  sessionId: string,
  dockerClient: DockerClient
): Promise<void> {
  const containerName = generatePreviewResourceName(projectId, sessionId, 'redis');

  try {
    // Stop container
    try {
      await dockerClient.containerStop(containerName, { timeout: 5 });
      console.log(`Stopped Redis container ${containerName}`);
    } catch (error) {
      console.log(`Failed to stop Redis container ${containerName}:`, error);
    }

    // Remove container and associated volumes
    try {
      await dockerClient.containerDelete(containerName, { force: true, volumes: true });
      console.log(`✅ Removed Redis container ${containerName} and its volumes`);
    } catch (error) {
      console.log(`Failed to remove Redis container ${containerName}:`, error);
    }
  } catch (error) {
    console.error(`Error removing Redis container ${containerName}:`, error);
    throw error;
  }
}

/**
 * Create all storages defined in kosuke.config.json
 * Returns a map of storage key to connection URL
 */
export async function createPreviewStorages(
  projectId: string,
  sessionId: string,
  config: KosukeConfig,
  dockerClient: DockerClient,
  network: string
): Promise<Record<string, StorageConnectionInfo>> {
  const connectionInfo: Record<string, StorageConnectionInfo> = {};

  if (!config.preview.storages) {
    return connectionInfo;
  }

  for (const [storageName, storageConfig] of Object.entries(config.preview.storages)) {
    try {
      if (storageConfig.type === 'postgres') {
        const url = await createPostgresDatabase(projectId, sessionId);
        connectionInfo[storageName] = { type: 'postgres', url };
      } else if (storageConfig.type === 'redis') {
        const containerName = await createRedisContainer(
          projectId,
          sessionId,
          dockerClient,
          network
        );
        connectionInfo[storageName] = { type: 'redis', url: `redis://${containerName}:6379` };
      }
    } catch (error) {
      console.error(`Failed to create storage ${storageName}:`, error);
      throw new Error(
        `Failed to create ${storageConfig.type} storage: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return connectionInfo;
}

/**
 * Drop all storages for a preview environment
 */
export async function dropPreviewStorages(
  projectId: string,
  sessionId: string,
  config: KosukeConfig,
  dockerClient: DockerClient
): Promise<void> {
  if (!config.preview.storages) {
    return;
  }

  const errors: Error[] = [];

  for (const [storageKey, storageConfig] of Object.entries(config.preview.storages)) {
    try {
      if (storageConfig.type === 'postgres') {
        await dropPostgresDatabase(projectId, sessionId);
      } else if (storageConfig.type === 'redis') {
        await removeRedisContainer(projectId, sessionId, dockerClient);
      }
    } catch (error) {
      console.error(`Failed to drop storage ${storageKey}:`, error);
      errors.push(
        error instanceof Error ? error : new Error(`Failed to drop storage ${storageKey}`)
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(`Failed to drop some storages: ${errors.map(e => e.message).join(', ')}`);
  }
}
