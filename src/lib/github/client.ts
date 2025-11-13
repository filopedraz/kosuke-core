import { getGitHubToken } from '@/lib/github/auth';
import { Octokit } from '@octokit/rest';

/**
 * Get Kosuke organization name
 */
export function getKosukeOrg(): string {
  const org = process.env.NEXT_PUBLIC_GITHUB_WORKSPACE;
  if (!org) {
    throw new Error(
      'NEXT_PUBLIC_GITHUB_WORKSPACE not configured. Set it in environment variables.'
    );
  }
  return org;
}

/**
 * Create an authenticated Octokit client for a given Clerk user
 */
export async function createOctokit(userId: string): Promise<Octokit> {
  const token = await getGitHubToken(userId);
  if (!token) {
    throw new Error('GitHub not connected');
  }
  return new Octokit({ auth: token });
}

/**
 * Create an authenticated Octokit client for Kosuke org operations
 */
export function createKosukeOctokit(): Octokit {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN not configured. Set it in environment variables.');
  }
  return new Octokit({ auth: token });
}
