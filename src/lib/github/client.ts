import { getGitHubToken } from '@/lib/github/auth';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';

/**
 * Create an authenticated Octokit client for a given Clerk user
 */
export async function createUserOctokit(userId: string): Promise<Octokit> {
  const token = await getGitHubToken(userId);
  if (!token) {
    throw new Error('GitHub not connected');
  }
  return new Octokit({ auth: token });
}

/**
 * Create an authenticated Octokit client for Kosuke org operations using GitHub App authentication
 */
export function createKosukeOctokit(): Octokit {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
  const installationId = process.env.GITHUB_APP_INSTALLATION_ID;

  if (!appId || !privateKey || !installationId) {
    throw new Error('GitHub App authentication not configured.');
  }

  console.log('Using GitHub App authentication');

  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId,
      privateKey: privateKey.replace(/\\n/g, '\n'),
      installationId,
    },
  });
}

/**
 * Get an installation access token from the GitHub App
 * This token can be used for git operations (clone, push, etc.)
 */
export async function getKosukeGitHubToken(): Promise<string> {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
  const installationId = process.env.GITHUB_APP_INSTALLATION_ID;

  if (!appId || !privateKey || !installationId) {
    throw new Error('GitHub App authentication not configured.');
  }

  const auth = createAppAuth({
    appId,
    privateKey: privateKey.replace(/\\n/g, '\n'),
    installationId,
  });

  const { token } = await auth({ type: 'installation' });
  return token;
}
