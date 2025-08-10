import { getGitHubToken } from '@/lib/github/auth';
import { Octokit } from '@octokit/rest';

// Create an authenticated Octokit client for a given Clerk user
export async function createOctokit(userId: string): Promise<Octokit> {
  const token = await getGitHubToken(userId);
  if (!token) {
    throw new Error('GitHub not connected');
  }
  return new Octokit({ auth: token });
}
