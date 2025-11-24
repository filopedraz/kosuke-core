/**
 * Router Adapters
 * Strategies for routing traffic to preview containers (Port mapping or Traefik)
 */

import type { RouteInfo } from '@/lib/types/docker';
import type { ContainerInspectResponse } from '@docker/node-sdk';
import { getPreviewConfig } from './config';

/**
 * Base interface for router adapters
 */
export interface RouterAdapter {
  /**
   * Prepare container configuration for running a new container
   */
  prepareRun(projectId: string, sessionId: string, containerName: string): RouteInfo;

  /**
   * Extract URL from an existing container
   */
  getContainerUrl(container: ContainerInspectResponse): string | null;
}

/**
 * Port Router Adapter
 * Maps container port to random host port for local development
 */
export class PortRouterAdapter implements RouterAdapter {
  private portRangeStart: number;
  private portRangeEnd: number;

  constructor(portRangeStart: number, portRangeEnd: number) {
    this.portRangeStart = portRangeStart;
    this.portRangeEnd = portRangeEnd;
  }

  /**
   * Pick a random port from the configured range
   */
  private pickRandomPort(): number {
    const range = this.portRangeEnd - this.portRangeStart + 1;
    return Math.floor(Math.random() * range) + this.portRangeStart;
  }

  /**
   * Prepare container configuration for port-based routing
   */
  prepareRun(projectId: string, sessionId: string): RouteInfo {
    const hostPort = this.pickRandomPort();

    const labels = {
      'kosuke.project_id': projectId,
      'kosuke.session_id': sessionId,
      'kosuke.branch': sessionId,
    };

    const url = `http://localhost:${hostPort}`;

    return {
      url,
      port: hostPort,
      labels,
    };
  }

  /**
   * Extract URL from an existing container (port mode)
   */
  getContainerUrl(container: ContainerInspectResponse): string | null {
    const ports = container.NetworkSettings?.Ports || {};
    const mapping = ports['3000/tcp'];
    if (mapping && mapping.length > 0 && mapping[0]?.HostPort) {
      return `http://localhost:${mapping[0].HostPort}`;
    }
    return null;
  }
}

/**
 * Traefik Router Adapter
 * Configures dynamic subdomain routing via Traefik reverse proxy
 */
export class TraefikRouterAdapter implements RouterAdapter {
  /**
   * Generate subdomain for Traefik routing
   * Format: project-{id}-{sanitized-session}.{preview_base_domain}
   */
  private generateSubdomain(projectId: string, sessionId: string): string {
    const config = getPreviewConfig();

    // Sanitize session ID for URL usage
    let sanitizedSession = sessionId.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    // Replace multiple consecutive hyphens with single hyphen
    sanitizedSession = sanitizedSession.replace(/-+/g, '-');
    // Remove leading/trailing hyphens
    sanitizedSession = sanitizedSession.replace(/^-+|-+$/g, '');

    // Limit length and ensure it's valid
    if (sanitizedSession.length > 20) {
      sanitizedSession = sanitizedSession.substring(0, 20).replace(/-+$/, '');
    }

    // Create subdomain: project-{id}-{session} on preview base domain
    const subdomain = `project-${projectId}-${sanitizedSession}`;
    const fullDomain = `${subdomain}.${config.previewBaseDomain}`;

    console.log(
      `Generated subdomain: ${fullDomain} for project ${projectId}, session: ${sessionId}`
    );
    return fullDomain;
  }

  /**
   * Prepare container configuration for Traefik-based routing
   */
  prepareRun(projectId: string, sessionId: string, containerName: string): RouteInfo {
    // Session ID acts as branch name in our previews
    const branchName = sessionId;
    const projectDomain = this.generateSubdomain(projectId, branchName);

    const labels = {
      'traefik.enable': 'true',
      [`traefik.http.routers.${containerName}.rule`]: `Host(\`${projectDomain}\`)`,
      [`traefik.http.routers.${containerName}.tls.certresolver`]: 'letsencrypt',
      [`traefik.http.services.${containerName}.loadbalancer.server.port`]: '3000',
      'traefik.docker.network': 'kosuke_network',
      'kosuke.project_id': projectId,
      'kosuke.session_id': sessionId,
      'kosuke.branch': branchName,
    };

    const url = `https://${projectDomain}`;

    return {
      url,
      subdomain: projectDomain,
      labels,
    };
  }

  /**
   * Extract URL from an existing container (Traefik mode)
   * Regenerates the subdomain from labels to ensure consistency
   */
  getContainerUrl(container: ContainerInspectResponse): string | null {
    const labels = container.Config?.Labels || {};

    // Extract project ID and session ID from kosuke labels
    const projectId = labels['kosuke.project_id'];
    const sessionId = labels['kosuke.session_id'];

    if (projectId && sessionId) {
      // Regenerate subdomain using same logic as prepareRun
      const projectDomain = this.generateSubdomain(projectId, sessionId);
      return `https://${projectDomain}`;
    }

    return null;
  }
}
