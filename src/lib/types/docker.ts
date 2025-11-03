/**
 * Docker Service Types
 * Type definitions for Docker container management
 */

/**
 * Router mode for preview containers
 */
export type RouterMode = 'port' | 'traefik';

/**
 * Route information returned by router adapters
 */
export interface RouteInfo {
  url: string;
  port?: number;
  subdomain?: string;
  labels?: Record<string, string>;
}

/**
 * Docker container status response
 */
export interface DockerContainerStatus {
  running: boolean;
  url: string | null;
  is_responding: boolean;
}

/**
 * Docker service configuration
 */
export interface DockerConfig {
  // Preview image settings
  previewDefaultImage: string;

  // Port mode settings
  previewPortRangeStart: number;
  previewPortRangeEnd: number;

  // Router configuration
  routerMode: RouterMode;
  traefikEnabled: boolean;

  // Health check settings
  previewHealthPath: string;

  // Network settings
  previewNetwork: string;

  // Container naming
  previewContainerNamePrefix: string;

  // Docker-in-Docker
  hostWorkspaceDir: string;

  // Domain settings (for Traefik)
  mainDomain: string;
  previewBaseDomain: string;

  // PostgreSQL settings
  postgresHost: string;
  postgresPort: number;
  postgresDb: string;
  postgresUser: string;
  postgresPassword: string;
}
