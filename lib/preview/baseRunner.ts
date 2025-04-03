/**
 * Base abstract class for preview runners
 * Provides common functionality for both process and Docker runners
 */
export abstract class BaseRunner {
  protected urls: Map<number, string> = new Map();

  /**
   * Start a preview app for a project
   * @param projectId The project ID to start
   * @returns The URL of the preview
   */
  abstract startApp(projectId: number): Promise<string>;

  /**
   * Stop a preview app for a project
   * @param projectId The project ID to stop
   */
  abstract stopApp(projectId: number): Promise<void>;

  /**
   * Check if a project is ready for preview
   * @param projectId The project ID to check
   */
  abstract isReadyForPreview(projectId: number): Promise<boolean>;

  /**
   * Get the status of a project preview
   * @param projectId The project ID to get status for
   */
  abstract getProjectStatus(projectId: number): Promise<{
    running: boolean;
    url: string | null;
    compilationComplete: boolean;
    isResponding: boolean;
  }>;

  /**
   * Get the URL for a project preview
   * @param projectId The project ID to get URL for
   */
  getAppUrl(projectId: number): string | null {
    return this.urls.get(projectId) || null;
  }

  /**
   * Update tracking for an existing container
   * This is a utility method to help synchronize with externally created or discovered containers
   * @param projectId The project ID to update tracking for
   * @param containerName The container name or ID
   * @param hostPort The host port that the container is using
   */
  updateTrackingForExistingContainer?(
    projectId: number,
    containerName: string,
    hostPort: number
  ): Promise<void>;

  /**
   * Check if compilation is complete for a project
   * @param projectId The project ID to check
   */
  abstract isCompilationComplete(projectId: number): boolean;

  /**
   * Stop all preview apps
   */
  abstract stopAll(): Promise<void>;
}
