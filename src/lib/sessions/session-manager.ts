/**
 * Session Manager
 * Manages isolated session environments for chat sessions
 */

import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import simpleGit, { type SimpleGit } from 'simple-git';

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
    } catch (error) {
      console.error(`⚠️ Error validating session directory: ${sessionPath}`);
      console.error(`   Error details:`, error);
      console.error(`   Current user: ${process.env.USER || 'unknown'}`);
      console.error(`   Process UID: ${process.getuid?.() || 'N/A'}`);
      console.error(`   Process GID: ${process.getgid?.() || 'N/A'}`);
      return false;
    }
  }

  /**
   * Configure Git user identity using database
   * Fetches user information from database and sets it locally in the repository
   */
  private async configureGitIdentity(git: SimpleGit, userId: string): Promise<void> {
    try {
      // Fetch user information from database
      const [user] = await db
        .select({
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(eq(users.clerkUserId, userId))
        .limit(1);

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // Use user's name or email username as fallback
      const gitName = user.name || 'Kosuke User';
      const gitEmail = user.email;

      // Configure Git identity locally (repository-specific, not global)
      await git.addConfig('user.name', gitName, false, 'local');
      await git.addConfig('user.email', gitEmail, false, 'local');

      console.log(`✅ Configured Git identity: ${gitName} <${gitEmail}>`);
    } catch (error) {
      console.error('❌ Error configuring Git identity:', error);
      throw new Error(
        `Failed to configure Git identity: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create a session environment by cloning from the main project
   */
  private async createSessionEnvironment(
    projectId: number,
    sessionId: string,
    userId: string,
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
      console.log(`✅ Cloned from ${mainProjectPath} to ${sessionPath}`);

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

      await this.configureGitIdentity(sessionGit, userId);

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
    userId: string,
    baseBranch: string = 'main'
  ): Promise<void> {
    const isValid = await this.validateSessionDirectory(projectId, sessionId);

    if (!isValid) {
      console.log(`Session environment does not exist, creating: ${sessionId}`);
      await this.createSessionEnvironment(projectId, sessionId, userId, baseBranch);
    }
  }

  /**
   * Pull latest changes for a session branch from remote
   */
  async pullSessionBranch(
    projectId: number,
    sessionId: string,
    githubToken: string
  ): Promise<{
    success: boolean;
    changed: boolean;
    commits_pulled: number;
    message: string;
    previous_commit?: string;
    new_commit?: string;
    branch_name: string;
  }> {
    const sessionPath = this.getSessionPath(projectId, sessionId);
    const sessionBranchName = `${SESSION_BRANCH_PREFIX}${sessionId}`;

    console.log(`📥 Pulling session branch ${sessionBranchName} for project ${projectId}`);

    try {
      // Validate session directory exists
      if (!existsSync(sessionPath)) {
        throw new Error(`Session directory does not exist: ${sessionPath}`);
      }

      // Initialize git
      const git = simpleGit(sessionPath);

      // Get current commit before pull
      const currentCommit = await git.revparse(['HEAD']);
      console.log(`Current commit: ${currentCommit.substring(0, 8)}`);

      // Fetch latest changes from remote with authentication
      console.log('🔄 Fetching latest changes from remote...');
      const remotes = await git.getRemotes(true);
      const origin = remotes.find(r => r.name === 'origin');

      if (!origin || !origin.refs.fetch) {
        throw new Error('No origin remote found');
      }

      // Build authenticated URL for fetch
      const originalUrl = origin.refs.fetch;
      const authenticatedUrl = this.buildAuthenticatedGitUrl(originalUrl, githubToken);

      // Temporarily set authenticated URL
      await git.remote(['set-url', 'origin', authenticatedUrl]);

      try {
        // Fetch from remote
        await git.fetch('origin', sessionBranchName);
        console.log(`✅ Fetched ${sessionBranchName} from remote`);
      } finally {
        // Always restore original URL
        await git.remote(['set-url', 'origin', originalUrl]);
      }

      // Check if remote branch exists
      const remoteBranch = `origin/${sessionBranchName}`;
      try {
        await git.revparse([remoteBranch]);
      } catch {
        console.log(`⚠️ Remote branch ${sessionBranchName} doesn't exist, no changes to pull`);
        return {
          success: true,
          changed: false,
          commits_pulled: 0,
          message: 'No remote branch to pull from',
          branch_name: sessionBranchName,
          previous_commit: currentCommit,
          new_commit: currentCommit,
        };
      }

      // Hard reset to remote branch
      console.log(`🔄 Performing hard reset to ${remoteBranch}`);
      await git.reset(['--hard', remoteBranch]);

      // Get new commit after pull
      const newCommit = await git.revparse(['HEAD']);
      console.log(`New commit: ${newCommit.substring(0, 8)}`);

      // Count commits pulled
      let commitsPulled = 0;
      if (currentCommit !== newCommit) {
        try {
          const log = await git.log({ from: currentCommit, to: newCommit });
          commitsPulled = log.total;
        } catch {
          // If log fails, assume at least 1 commit was pulled
          commitsPulled = 1;
        }
      }

      const changed = commitsPulled > 0;
      console.log(`✅ Pull complete: ${commitsPulled} commit(s) pulled, changed: ${changed}`);

      return {
        success: true,
        changed,
        commits_pulled: commitsPulled,
        message: changed ? `Successfully pulled ${commitsPulled} commit(s)` : 'Already up to date',
        previous_commit: currentCommit,
        new_commit: newCommit,
        branch_name: sessionBranchName,
      };
    } catch (error) {
      console.error(`❌ Failed to pull session branch: ${error}`);
      return {
        success: false,
        changed: false,
        commits_pulled: 0,
        message: error instanceof Error ? error.message : 'Unknown error',
        branch_name: sessionBranchName,
      };
    }
  }

  /**
   * Build authenticated GitHub URL with token
   */
  private buildAuthenticatedGitUrl(repoUrl: string, token: string): string {
    try {
      // Handle GitHub HTTPS URLs
      if (repoUrl.includes('github.com')) {
        const match = repoUrl.match(/github\.com[/:]([\w-]+)\/([\w.-]+?)(?:\.git)?$/);
        if (match) {
          const [, owner, repo] = match;
          return `https://x-access-token:${token}@github.com/${owner}/${repo}.git`;
        }
      }

      // Fallback to original URL
      return repoUrl;
    } catch (error) {
      console.error('Error building authenticated URL:', error);
      return repoUrl;
    }
  }
}
