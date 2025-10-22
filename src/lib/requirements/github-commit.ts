/**
 * GitHub Commit Helper for Requirements Documents
 *
 * Commits the locally generated docs.md to the GitHub repository
 */

import { Octokit } from '@octokit/rest';
import { readDocs } from './claude-requirements';

/**
 * Commit docs.md to GitHub repository
 */
export async function commitDocsToGitHub(
  projectId: number,
  githubToken: string,
  owner: string,
  repo: string,
  branch: string = 'main'
): Promise<{ success: boolean; commitSha?: string; error?: string }> {
  try {
    const octokit = new Octokit({ auth: githubToken });

    // Read docs.md from local workspace
    const docsContent = readDocs(projectId);
    if (!docsContent) {
      return {
        success: false,
        error: 'docs.md not found in workspace',
      };
    }

    // Get the current commit SHA of the branch
    const { data: refData } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });

    const currentCommitSha = refData.object.sha;

    // Get the tree for the current commit
    const { data: commitData } = await octokit.rest.git.getCommit({
      owner,
      repo,
      commit_sha: currentCommitSha,
    });

    const currentTreeSha = commitData.tree.sha;

    // Check if docs.md already exists
    let existingFileSha: string | undefined;
    try {
      const { data: fileData } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: 'docs.md',
        ref: branch,
      });

      if ('sha' in fileData) {
        existingFileSha = fileData.sha;
      }
    } catch (error) {
      // File doesn't exist yet, that's fine
      existingFileSha = undefined;
    }

    // Create a blob for the docs.md content
    const { data: blobData } = await octokit.rest.git.createBlob({
      owner,
      repo,
      content: Buffer.from(docsContent).toString('base64'),
      encoding: 'base64',
    });

    // Create a new tree with the docs.md file
    const { data: newTree } = await octokit.rest.git.createTree({
      owner,
      repo,
      base_tree: currentTreeSha,
      tree: [
        {
          path: 'docs.md',
          mode: '100644',
          type: 'blob',
          sha: blobData.sha,
        },
      ],
    });

    // Create a commit
    const commitMessage = existingFileSha
      ? 'Update requirements document (docs.md)'
      : 'Add requirements document (docs.md)';

    const { data: newCommit } = await octokit.rest.git.createCommit({
      owner,
      repo,
      message: commitMessage,
      tree: newTree.sha,
      parents: [currentCommitSha],
    });

    // Update the branch reference
    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: newCommit.sha,
    });

    console.log(`✅ docs.md committed to ${owner}/${repo} on ${branch}: ${newCommit.sha}`);

    return {
      success: true,
      commitSha: newCommit.sha,
    };
  } catch (error) {
    console.error('Error committing docs.md to GitHub:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
