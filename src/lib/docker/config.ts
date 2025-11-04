/**
 * Docker Configuration
 * Loads Docker-related settings from environment variables
 */

import type { DockerConfig, RouterMode } from '@/lib/types/docker';

/**
 * Get Docker configuration from environment variables
 */
export function getDockerConfig(): DockerConfig {
  // Preview image settings
  const previewDefaultImage =
    process.env.PREVIEW_DEFAULT_IMAGE || 'ghcr.io/kosuke-org/kosuke-template:v1.8.0';

  // Port mode settings
  const previewPortRangeStart = parseInt(process.env.PREVIEW_PORT_RANGE_START || '3001', 10);
  const previewPortRangeEnd = parseInt(process.env.PREVIEW_PORT_RANGE_END || '3100', 10);

  // Router configuration
  const traefikEnabled = process.env.TRAEFIK_ENABLED?.toLowerCase() === 'true';
  const routerMode: RouterMode =
    (process.env.ROUTER_MODE as RouterMode) || (traefikEnabled ? 'traefik' : 'port');

  // Health check settings
  const previewHealthPath = process.env.PREVIEW_HEALTH_PATH || '/';

  // Network settings
  const previewNetwork = process.env.PREVIEW_NETWORK || 'kosuke_network';

  // Container naming
  const previewContainerNamePrefix = process.env.PREVIEW_CONTAINER_NAME_PREFIX || 'kosuke-preview-';

  // Docker-in-Docker
  const hostWorkspaceDir = process.env.HOST_WORKSPACE_DIR || '';
  if (!hostWorkspaceDir) {
    throw new Error(
      'HOST_WORKSPACE_DIR is required for Docker-in-Docker. ' +
        'Set HOST_WORKSPACE_DIR to the absolute path of the workspace root on the host.'
    );
  }

  // Domain settings (for Traefik)
  const mainDomain = process.env.MAIN_DOMAIN || 'kosuke.ai';
  const previewBaseDomain = process.env.PREVIEW_BASE_DOMAIN || 'kosuke.app';

  // PostgreSQL settings
  const postgresHost = process.env.POSTGRES_HOST || 'postgres';
  const postgresPort = parseInt(process.env.POSTGRES_PORT || '5432', 10);
  const postgresDb = process.env.POSTGRES_DB || 'postgres';
  const postgresUser = process.env.POSTGRES_USER || 'postgres';
  const postgresPassword = process.env.POSTGRES_PASSWORD || 'postgres';

  return {
    previewDefaultImage,
    previewPortRangeStart,
    previewPortRangeEnd,
    routerMode,
    traefikEnabled,
    previewHealthPath,
    previewNetwork,
    previewContainerNamePrefix,
    hostWorkspaceDir,
    mainDomain,
    previewBaseDomain,
    postgresHost,
    postgresPort,
    postgresDb,
    postgresUser,
    postgresPassword,
  };
}

/**
 * Validate Docker configuration
 */
export function validateDockerConfig(config: DockerConfig): void {
  if (!config.hostWorkspaceDir) {
    throw new Error('HOST_WORKSPACE_DIR is required');
  }

  if (config.previewPortRangeStart >= config.previewPortRangeEnd) {
    throw new Error('PREVIEW_PORT_RANGE_START must be less than PREVIEW_PORT_RANGE_END');
  }

  if (config.routerMode !== 'port' && config.routerMode !== 'traefik') {
    throw new Error('ROUTER_MODE must be either "port" or "traefik"');
  }
}
