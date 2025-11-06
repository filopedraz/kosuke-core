import type {
  CreateRepositoryFromTemplateRequest,
  GitHubRepoResponse,
  GitHubRepository,
} from '@/lib/types/github';
import crypto from 'crypto';
import { createKosukeOctokit, createOctokit, KOSUKE_ORG } from './client';

export async function listUserRepositories(
  userId: string,
  page: number = 1,
  perPage: number = 10,
  search: string = ''
): Promise<{ repositories: GitHubRepository[]; hasMore: boolean }> {
  const octokit = await createOctokit(userId);

  let repositories: GitHubRepository[];
  let hasMore: boolean;

  if (search) {
    // Use search API when search term is provided
    const searchResponse = await octokit.rest.search.repos({
      q: `${search} in:name user:@me`,
      per_page: perPage,
      page,
      sort: 'updated',
    });

    repositories = searchResponse.data.items.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      private: repo.private ?? false,
      html_url: repo.html_url,
      clone_url: repo.clone_url ?? '',
      default_branch: repo.default_branch ?? 'main',
      language: repo.language as string | null,
      created_at: repo.created_at as unknown as string,
      updated_at: repo.updated_at as unknown as string,
    }));

    hasMore = searchResponse.data.items.length === perPage;
  } else {
    // Use regular list when no search
    const response = await octokit.rest.repos.listForAuthenticatedUser({
      per_page: perPage,
      page,
      sort: 'updated',
    });

    repositories = response.data.map(repo => ({
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
    }));

    hasMore = response.data.length === perPage;
  }

  return { repositories, hasMore };
}

/**
 * Create repository in Kosuke organization from template
 */
export async function createRepositoryFromTemplate(
  request: CreateRepositoryFromTemplateRequest
): Promise<GitHubRepoResponse> {
  const octokit = createKosukeOctokit();

  // Parse template repository
  const templateRepo = request.templateRepo;

  if (!templateRepo.includes('/')) {
    throw new Error(`Invalid template repository format: ${templateRepo}. Expected 'owner/repo'`);
  }
  const [templateOwner, templateName] = templateRepo.split('/', 2);

  // Sanitize and auto-generate unique repo name
  const sanitizedName = request.name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);

  // Generate 8-char hex ID (4 bytes = 8 hex chars)
  const shortId = crypto.randomBytes(4).toString('hex');
  const repoName = `${sanitizedName}-${shortId}`;

  console.log(`Creating repo in ${KOSUKE_ORG}: ${repoName}`);

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

  // Check if repository name is already taken in org
  try {
    const { data: existingRepo } = await octokit.rest.repos.get({
      owner: KOSUKE_ORG,
      repo: repoName,
    });
    if (existingRepo) {
      throw new Error(`Repository ${repoName} already exists in ${KOSUKE_ORG}`);
    }
  } catch (error) {
    // If we get a 404, the repo doesn't exist (which is what we want)
    if (error instanceof Error && !error.message.includes('Not Found')) {
      throw error;
    }
  }

  // Create repository from template in Kosuke org
  try {
    const { data: repo } = await octokit.rest.repos.createUsingTemplate({
      template_owner: templateOwner,
      template_repo: templateName,
      owner: KOSUKE_ORG,
      name: repoName,
      description: request.description || `Kosuke project: ${request.name}`,
      private: request.private,
      include_all_branches: false,
    });

    console.log(`✅ Successfully created repository: ${repo.full_name}`);

    return {
      name: repo.name,
      owner: KOSUKE_ORG,
      url: repo.clone_url || '',
      private: repo.private,
      description: repo.description || undefined,
    };
  } catch (error) {
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();

      if (errorMessage.includes('already exists') || errorMessage.includes('name already exists')) {
        throw new Error('Repository name already exists in Kosuke organization');
      }

      if (errorMessage.includes('403') || errorMessage.includes('forbidden')) {
        throw new Error('Kosuke service token lacks permissions. Check token scopes.');
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
