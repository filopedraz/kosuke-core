import { BaseRunner } from './baseRunner';

/**
 * Kubernetes-based preview runner
 * Not implemented yet
 */
export class K8sRunner extends BaseRunner {
  private static instance: K8sRunner;

  private constructor() {
    super();
    console.log('K8sRunner initialized (not implemented yet)');
  }

  /**
   * Get the singleton instance of K8sRunner
   */
  public static getInstance(): K8sRunner {
    if (!K8sRunner.instance) {
      K8sRunner.instance = new K8sRunner();
    }
    return K8sRunner.instance;
  }

  /**
   * Start a preview app for a project
   * @param projectId The project ID to start
   */
  public async startApp(projectId: number): Promise<string> {
    throw new Error(`K8sRunner.startApp not implemented for project ${projectId}`);
  }

  /**
   * Stop a preview app for a project
   * @param projectId The project ID to stop
   */
  public async stopApp(projectId: number): Promise<void> {
    throw new Error(`K8sRunner.stopApp not implemented for project ${projectId}`);
  }

  /**
   * Check if a project is ready for preview
   * @param projectId The project ID to check
   */
  public async isReadyForPreview(projectId: number): Promise<boolean> {
    throw new Error(`K8sRunner.isReadyForPreview not implemented for project ${projectId}`);
  }

  /**
   * Get the status of a project preview
   * @param projectId The project ID to get status for
   */
  public async getProjectStatus(projectId: number): Promise<{
    running: boolean;
    url: string | null;
    compilationComplete: boolean;
    isResponding: boolean;
  }> {
    throw new Error(`K8sRunner.getProjectStatus not implemented for project ${projectId}`);
  }

  /**
   * Check if compilation is complete for a project
   * @param projectId The project ID to check
   */
  public isCompilationComplete(projectId: number): boolean {
    throw new Error(`K8sRunner.isCompilationComplete not implemented for project ${projectId}`);
  }

  /**
   * Stop all preview apps
   */
  public async stopAll(): Promise<void> {
    throw new Error('K8sRunner.stopAll not implemented');
  }
}
