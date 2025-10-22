/**
 * Session Manager
 * Manages isolated session environments for chat sessions
 */

import { existsSync } from 'fs';
import { join, resolve } from 'path';
import simpleGit from 'simple-git';

const PROJECTS_BASE_PATH = process.env.PROJECTS_BASE_PATH || './projects';

/**
 * Session Manager
 * Provides utilities for session directory management
 */
export class SessionManager {
  private projectsBasePath: string;

  constructor() {
    this.projectsBasePath = resolve(PROJECTS_BASE_PATH);
    console.log('🔧 SessionManager initialized');
    console.log(`📁 Projects base path: ${this.projectsBasePath}`);
  }

  /**
   * Get the file system path for a session directory
   */
  getSessionPath(projectId: number, sessionId: string): string {
    return join(this.projectsBasePath, String(projectId), 'sessions', sessionId);
  }

  /**
   * Validate that a session directory exists and is properly set up
   */
  async validateSessionDirectory(projectId: number, sessionId: string): Promise<boolean> {
    try {
      const sessionPath = this.getSessionPath(projectId, sessionId);

      // Check if directory exists
      if (!existsSync(sessionPath)) {
        console.warn(`⚠️ Session directory does not exist: ${sessionPath}`);
        return false;
      }

      // Check if it's a valid Git repository
      try {
        const git = simpleGit(sessionPath);
        await git.status();
        return true;
      } catch {
        console.warn(`⚠️ Session directory is not a valid Git repository: ${sessionPath}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error validating session directory:`, error);
      return false;
    }
  }
}
