import { createClerkClient } from '@clerk/nextjs/server';

// Initialize Clerk client with environment variables
const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

/**
 * Get GitHub access token for the authenticated user
 * Since all users sign up via GitHub, this should always return a token
 */
export async function getGitHubToken(userId: string): Promise<string | null> {
  try {
    const user = await clerk.users.getUser(userId);

    // Find GitHub external account (should always exist for our users)
    // Note: Clerk SDK uses camelCase 'externalAccounts' and 'oauth_github' provider
    const githubAccount = user.externalAccounts?.find(
      account => account.provider === 'oauth_github'
    );

    if (!githubAccount) {
      return null;
    }

    // Get the access token using Clerk's OAuth token endpoint
    try {
      const endpoint = `https://api.clerk.com/v1/users/${userId}/oauth_access_tokens/oauth_github`;

      const tokenResponse = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();

        // Handle array response (Clerk returns an array of tokens)
        let token = null;

        if (Array.isArray(tokenData) && tokenData.length > 0) {
          // Response is an array - take the first token
          const tokenObj = tokenData[0];
          token = tokenObj.token || tokenObj.access_token || tokenObj.oauth_access_token;
        } else {
          // Response is an object - try direct access
          token = tokenData.token || tokenData.access_token || tokenData.oauth_access_token;
        }

        if (token) {
          return token;
        } else {
          return null;
        }
      } else {
        return null;
      }
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

/**
 * Get GitHub user information for the authenticated user
 * Since all users sign up via GitHub, this should always return info
 */
export async function getUserGitHubInfo(userId: string): Promise<{
  githubUsername: string;
  githubId: string;
  connectedAt: Date;
} | null> {
  try {
    const user = await clerk.users.getUser(userId);

    // Find GitHub external account using Clerk SDK
    const githubAccount = user.externalAccounts?.find(
      account => account.provider === 'oauth_github'
    );

    if (!githubAccount) {
      return null;
    }

    return {
      githubUsername: githubAccount.username || '',
      githubId: githubAccount.externalId,
      connectedAt: new Date(githubAccount.verification?.expireAt || Date.now()),
    };
  } catch {
    return null;
  }
}

/**
 * Disconnect GitHub account
 * WARNING: This will effectively sign the user out since GitHub is required for Kosuke
 */
export async function disconnectGitHub(userId: string): Promise<void> {
  try {
    const user = await clerk.users.getUser(userId);

    // Find GitHub external account using Clerk SDK
    const githubAccount = user.externalAccounts?.find(
      account => account.provider === 'oauth_github'
    );

    if (githubAccount) {
      // Use Clerk SDK to disconnect external account
      await clerk.users.deleteUserExternalAccount({
        userId,
        externalAccountId: githubAccount.id,
      });
    }
  } catch {
    throw new Error('Failed to disconnect GitHub account');
  }
}

/**
 * Check if user has valid GitHub connection with required scopes
 * Validates the token by making a GitHub API call and checking scopes
 */
export async function hasRequiredGitHubScopes(userId: string): Promise<boolean> {
  try {
    const token = await getGitHubToken(userId);
    if (!token) {
      return false;
    }

    // Verify token and scopes by making a GitHub API call
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (response.ok) {
      // Check the OAuth scopes in the response headers
      const scopes = response.headers.get('x-oauth-scopes') || '';
      const requiredScopes = ['repo', 'workflow', 'admin:repo_hook', 'user:email', 'read:user'];

      // Check if all required scopes are present
      const hasAllScopes = requiredScopes.every(
        scope => scopes.includes(scope) || scopes.includes('repo') // 'repo' includes many sub-scopes
      );

      return hasAllScopes;
    } else {
      return false;
    }
  } catch {
    return false;
  }
}

/**
 * Test GitHub API connectivity and get user details
 * Useful for debugging and validation
 */
export async function testGitHubApiConnection(userId: string): Promise<{
  success: boolean;
  userInfo?: {
    login: string;
    id: number;
    name: string | null;
    public_repos: number;
    followers: number;
    [key: string]: unknown;
  };
  error?: string;
}> {
  try {
    const token = await getGitHubToken(userId);
    if (!token) {
      return { success: false, error: 'No GitHub token available' };
    }

    // Make a test API call to get user information
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (response.ok) {
      const userInfo = await response.json();

      return { success: true, userInfo };
    } else {
      return { success: false, error: `GitHub API error: ${response.status}` };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
