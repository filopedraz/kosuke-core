/**
 * Session Manager
 * Manages isolated session environments for chat sessions
 */

import { existsSync, mkdirSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import simpleGit from 'simple-git';

const PROJECTS_BASE_PATH = process.env.PROJECTS_BASE_PATH || './projects';
const SESSION_BRANCH_PREFIX = process.env.SESSION_BRANCH_PREFIX || 'kosuke/chat-';

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
   * Get the path to the main project directory
   */
  private getMainProjectPath(projectId: number): string {
    return join(this.projectsBasePath, String(projectId));
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

  /**
   * Create a session environment by cloning from the main project
   */
  private async createSessionEnvironment(
    projectId: number,
    sessionId: string,
    baseBranch: string = 'main'
  ): Promise<string> {
    const mainProjectPath = this.getMainProjectPath(projectId);
    const sessionPath = this.getSessionPath(projectId, sessionId);
    const sessionsDir = join(this.projectsBasePath, String(projectId), 'sessions');

    console.log(`Creating session environment for ${sessionId} in project ${projectId}`);

    // Check if main project exists
    if (!existsSync(mainProjectPath)) {
      throw new Error(`Main project directory does not exist: ${mainProjectPath}`);
    }

    // Create sessions directory if it doesn't exist
    if (!existsSync(sessionsDir)) {
      mkdirSync(sessionsDir, { recursive: true });
    }

    // Remove existing session directory if it exists
    if (existsSync(sessionPath)) {
      console.warn(`Session directory already exists, removing: ${sessionPath}`);
      rmSync(sessionPath, { recursive: true, force: true });
    }

    try {
      // Clone from main project to session directory (local clone)
      console.log(`Cloning from ${mainProjectPath} to ${sessionPath}`);
      const mainGit = simpleGit(mainProjectPath);
      await mainGit.clone(mainProjectPath, sessionPath, ['--local', '--no-hardlinks']);

      // Configure session repository
      const sessionGit = simpleGit(sessionPath);

      // Get the origin URL from main project
      const mainRemotes = await mainGit.getRemotes(true);
      const originRemote = mainRemotes.find(r => r.name === 'origin');

      if (originRemote) {
        // Set the origin to point to the actual GitHub repository
        await sessionGit.removeRemote('origin');
        await sessionGit.addRemote('origin', originRemote.refs.fetch);
      }

      // Checkout base branch
      try {
        await sessionGit.checkout(baseBranch);
      } catch (error) {
        console.warn(`Could not checkout ${baseBranch}, staying on current branch:`, error);
      }

      // Create session branch
      const sessionBranchName = `${SESSION_BRANCH_PREFIX}${sessionId}`;
      try {
        await sessionGit.checkoutLocalBranch(sessionBranchName);
        console.log(`✅ Created session branch: ${sessionBranchName}`);
      } catch (error) {
        console.warn(`Could not create session branch ${sessionBranchName}:`, error);
      }

      console.log(`✅ Session environment created successfully: ${sessionPath}`);
      return sessionPath;
    } catch (error) {
      console.error(`❌ Failed to create session environment for ${sessionId}:`, error);

      // Cleanup on failure
      if (existsSync(sessionPath)) {
        rmSync(sessionPath, { recursive: true, force: true });
      }

      throw new Error(
        `Failed to create session environment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Ensure session environment exists, create if it doesn't
   */
  async ensureSessionEnvironment(
    projectId: number,
    sessionId: string,
    baseBranch: string = 'main'
  ): Promise<void> {
    const isValid = await this.validateSessionDirectory(projectId, sessionId);

    if (!isValid) {
      console.log(`Session environment does not exist, creating: ${sessionId}`);
      await this.createSessionEnvironment(projectId, sessionId, baseBranch);
    }
  }
}
