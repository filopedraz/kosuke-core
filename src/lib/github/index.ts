import type { GitHubRepository } from '@/lib/types/github';
import type { RestEndpointMethodTypes } from '@octokit/rest';
import { createOctokit } from './client';

export async function listUserRepositories(userId: string): Promise<GitHubRepository[]> {
  const octokit = await createOctokit(userId);
  const repos = await octokit.paginate(octokit.rest.repos.listForAuthenticatedUser, {
    per_page: 100,
    sort: 'updated',
  });
  // Octokit returns slightly different shapes; normalize to our type
  return repos.map(
    (
      repo: RestEndpointMethodTypes['repos']['listForAuthenticatedUser']['response']['data'][0]
    ) => ({
      id: String(repo.id),
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      private: repo.private ?? false,
      html_url: repo.html_url,
      clone_url: repo.clone_url,
      default_branch: repo.default_branch ?? 'main',
      language: repo.language as string | null,
      created_at: repo.created_at as unknown as string,
      updated_at: repo.updated_at as unknown as string,
    })
  );
}

export async function listBranches(userId: string, owner: string, repo: string) {
  const octokit = await createOctokit(userId);
  const { data } = await octokit.rest.repos.listBranches({ owner, repo, per_page: 100 });
  return data;
}

export async function getCombinedStatus(userId: string, owner: string, repo: string, ref: string) {
  const octokit = await createOctokit(userId);
  const { data } = await octokit.rest.repos.getCombinedStatusForRef({ owner, repo, ref });
  return data;
}

export async function listPullRequests(userId: string, owner: string, repo: string) {
  const octokit = await createOctokit(userId);
  const { data } = await octokit.rest.pulls.list({ owner, repo, state: 'open', per_page: 100 });
  return data;
}

export async function createPullRequest(
  userId: string,
  owner: string,
  repo: string,
  head: string,
  base: string,
  title: string,
  body?: string
) {
  const octokit = await createOctokit(userId);
  const { data } = await octokit.rest.pulls.create({ owner, repo, head, base, title, body });
  return data;
}

export async function mergePullRequest(
  userId: string,
  owner: string,
  repo: string,
  pull_number: number
) {
  const octokit = await createOctokit(userId);
  const { data } = await octokit.rest.pulls.merge({ owner, repo, pull_number });
  return data;
}
