/**
 * Preview Configuration
 * Loads Preview-related settings from environment variables
 */

import type { PreviewConfig, RouterMode } from '@/lib/types/docker';

/**
 * Get Preview configuration from environment variables
 */
export function getPreviewConfig(): PreviewConfig {
  // Preview image settings
  const bunPreviewImage = process.env.PREVIEW_BUN_IMAGE;
  if (!bunPreviewImage) {
    throw new Error('PREVIEW_BUN_IMAGE environment variable is required');
  }
  const pythonPreviewImage = process.env.PREVIEW_PYTHON_IMAGE;
  if (!pythonPreviewImage) {
    throw new Error('PREVIEW_PYTHON_IMAGE environment variable is required');
  }

  // Port mode settings
  const previewPortRangeStart = parseInt(process.env.PREVIEW_PORT_RANGE_START ?? '', 10);
  const previewPortRangeEnd = parseInt(process.env.PREVIEW_PORT_RANGE_END ?? '', 10);
  if (isNaN(previewPortRangeStart) || isNaN(previewPortRangeEnd)) {
    throw new Error('PREVIEW_PORT_RANGE_START and PREVIEW_PORT_RANGE_END must be valid numbers');
  }
  if (previewPortRangeStart >= previewPortRangeEnd) {
    throw new Error('PREVIEW_PORT_RANGE_START must be less than PREVIEW_PORT_RANGE_END');
  }

  // Router configuration
  const traefikEnabled = process.env.TRAEFIK_ENABLED?.toLowerCase() === 'true';
  const routerMode = traefikEnabled ? ('traefik' as RouterMode) : ('port' as RouterMode);

  // Health check settings
  const previewHealthPath = process.env.PREVIEW_HEALTH_PATH;
  if (!previewHealthPath) {
    throw new Error('PREVIEW_HEALTH_PATH environment variable is required');
  }

  // Network settings
  const previewNetwork = process.env.PREVIEW_NETWORK;
  if (!previewNetwork) {
    throw new Error('PREVIEW_NETWORK environment variable is required');
  }

  // Container naming
  const previewContainerNamePrefix = process.env.PREVIEW_RESOURCE_PREFIX;
  if (!previewContainerNamePrefix) {
    throw new Error('PREVIEW_RESOURCE_PREFIX environment variable is required');
  }

  // Docker-in-Docker
  const hostWorkspaceDir = process.env.HOST_WORKSPACE_DIR;
  if (!hostWorkspaceDir) {
    throw new Error(
      'HOST_WORKSPACE_DIR is required for Docker-in-Docker. ' +
        'Set HOST_WORKSPACE_DIR to the absolute path of the workspace root on the host.'
    );
  }

  // Domain settings (for Traefik)
  const previewBaseDomain = process.env.PREVIEW_BASE_DOMAIN;
  if (!previewBaseDomain) {
    throw new Error('PREVIEW_BASE_DOMAIN environment variable is required');
  }

  // PostgreSQL settings
  const postgresHost = process.env.POSTGRES_HOST;
  if (!postgresHost) {
    throw new Error('POSTGRES_HOST environment variable is required');
  }
  const postgresPort = parseInt(process.env.POSTGRES_PORT ?? '', 10);
  if (isNaN(postgresPort)) {
    throw new Error('POSTGRES_PORT must be a valid number');
  }
  const postgresDb = process.env.POSTGRES_DB;
  if (!postgresDb) {
    throw new Error('POSTGRES_DB environment variable is required');
  }
  const postgresUser = process.env.POSTGRES_USER;
  if (!postgresUser) {
    throw new Error('POSTGRES_USER environment variable is required');
  }
  const postgresPassword = process.env.POSTGRES_PASSWORD;
  if (!postgresPassword) {
    throw new Error('POSTGRES_PASSWORD environment variable is required');
  }

  return {
    bunPreviewImage,
    pythonPreviewImage,
    previewPortRangeStart,
    previewPortRangeEnd,
    routerMode,
    traefikEnabled,
    previewHealthPath,
    previewNetwork,
    previewContainerNamePrefix,
    hostWorkspaceDir,
    previewBaseDomain,
    postgresHost,
    postgresPort,
    postgresDb,
    postgresUser,
    postgresPassword,
  };
}
