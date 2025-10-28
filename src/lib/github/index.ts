import type {
  CreateRepositoryFromTemplateRequest,
  GitHubRepoResponse,
  GitHubRepository,
} from '@/lib/types/github';
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
      id: repo.id,
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

export async function createRepositoryFromTemplate(
  userId: string,
  request: CreateRepositoryFromTemplateRequest
): Promise<GitHubRepoResponse> {
  const octokit = await createOctokit(userId);

  // Parse template repository
  const templateRepo = request.templateRepo;

  if (!templateRepo.includes('/')) {
    throw new Error(`Invalid template repository format: ${templateRepo}. Expected 'owner/repo'`);
  }
  const [templateOwner, templateName] = templateRepo.split('/', 2);

  // Validate template repository exists and is a template
  try {
    const { data: template } = await octokit.rest.repos.get({
      owner: templateOwner,
      repo: templateName,
    });

    if (!template.is_template) {
      throw new Error(`Repository ${templateRepo} is not marked as a template repository`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Not Found')) {
      throw new Error(
        `Template repository '${templateRepo}' is not accessible. Please verify it exists and is marked as a template.`
      );
    }
    throw error;
  }

  // Get authenticated user info
  const { data: user } = await octokit.rest.users.getAuthenticated();

  // Check if repository name is already taken
  try {
    const { data: existingRepo } = await octokit.rest.repos.get({
      owner: user.login,
      repo: request.name,
    });
    if (existingRepo) {
      throw new Error(`Repository name is already taken`);
    }
  } catch (error) {
    // If we get a 404, the repo doesn't exist (which is what we want)
    if (error instanceof Error && !error.message.includes('Not Found')) {
      throw error;
    }
  }

  // Create repository from template using GitHub API
  try {
    const { data: repo } = await octokit.rest.repos.createUsingTemplate({
      template_owner: templateOwner,
      template_repo: templateName,
      owner: user.login,
      name: request.name,
      description: request.description || '',
      private: request.private,
      include_all_branches: false,
    });

    console.log(`Successfully created repository: ${repo.full_name}`);

    return {
      name: repo.name,
      owner: repo.owner?.login || user.login,
      url: repo.clone_url || '',
      private: repo.private,
      description: repo.description || undefined,
    };
  } catch (error) {
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();

      if (errorMessage.includes('already exists') || errorMessage.includes('name already exists')) {
        throw new Error('Repository name is already taken');
      }

      if (errorMessage.includes('403') || errorMessage.includes('forbidden')) {
        throw new Error("Insufficient GitHub permissions. Ensure your token has 'repo' scope.");
      }

      if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        throw new Error(`Template repository '${templateRepo}' not found or not accessible`);
      }

      if (errorMessage.includes('422') || errorMessage.includes('validation')) {
        throw new Error(`Validation error: ${error.message}`);
      }
    }

    throw new Error(
      `Failed to create repository: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
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
